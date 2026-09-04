const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Admin PIN — change this to whatever you want
const ADMIN_PIN = process.env.ADMIN_PIN || "Admin123";

// Solo time gate: when true, solo registration only on Thursdays 20:30 Spain time
let soloTimeGateEnabled = true;

// Jam mode: "blues" (default) or "jazz". Controls theming, branding and song list.
let jamMode = "blues";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- SSE ---
let sseClients = [];

function broadcastUpdate() {
  const queue = db
    .prepare("SELECT * FROM participants ORDER BY position ASC, id ASC")
    .all();
  const data = JSON.stringify(queue);
  sseClients.forEach((res) => res.write(`data: ${data}\n\n`));
}

app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  sseClients.push(res);
  req.on("close", () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// --- Auth middleware for admin routes ---
function requirePin(req, res, next) {
  const pin = req.headers["x-admin-pin"];
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: "Invalid PIN" });
  }
  next();
}

// Verify PIN endpoint
app.post("/api/admin/verify", (req, res) => {
  const { pin } = req.body;
  const submitted = String(pin || "").trim();
  const expected = String(ADMIN_PIN).trim();
  if (submitted === expected) {
    res.json({ success: true });
  } else {
    console.log(`PIN rejected: got "${submitted}", expected "${expected}"`);
    res.status(401).json({ error: "Invalid PIN" });
  }
});

// Get solo time gate status (public — so register page can check)
app.get("/api/settings/solo-gate", (req, res) => {
  res.json({ enabled: soloTimeGateEnabled });
});

// Toggle solo time gate (admin only)
app.patch("/api/settings/solo-gate", requirePin, (req, res) => {
  const { enabled } = req.body;
  soloTimeGateEnabled = !!enabled;
  console.log(`Solo time gate ${soloTimeGateEnabled ? "enabled" : "disabled"} by admin`);
  res.json({ success: true, enabled: soloTimeGateEnabled });
});

// Get jam mode (public — every page reads this to theme/brand itself)
app.get("/api/settings/mode", (req, res) => {
  res.json({ mode: jamMode });
});

// Set jam mode (admin only)
app.patch("/api/settings/mode", requirePin, (req, res) => {
  const mode = req.body && req.body.mode === "jazz" ? "jazz" : "blues";
  jamMode = mode;
  console.log(`Jam mode set to "${jamMode}" by admin`);
  // Notify all connected clients so they re-theme immediately
  const data = JSON.stringify({ type: "mode", mode: jamMode });
  sseClients.forEach((r) => r.write(`data: ${data}\n\n`));
  res.json({ success: true, mode: jamMode });
});

// --- Public endpoints ---

// Get queue
app.get("/api/queue", (req, res) => {
  const queue = db
    .prepare("SELECT * FROM participants ORDER BY position ASC, id ASC")
    .all();
  res.json(queue);
});

// Get instrument demand — what's needed based on who has joined tonight
app.get("/api/demand", (req, res) => {
  const solos = db
    .prepare(
      "SELECT * FROM participants WHERE entry_type = 'individual' AND group_name IS NULL ORDER BY position ASC"
    )
    .all();

  const instrumentCounts = {};
  for (const s of solos) {
    const instr = normalizeInstrument(s.instrument);
    instrumentCounts[instr] = (instrumentCounts[instr] || 0) + 1;
  }

  // Mark ALL instruments that no solo has signed up with as needed
  const ALL_INSTRUMENTS = ["Guitar", "Bass", "Drums", "Vocals", "Keyboards", "Harmonica"];
  const needed = [];
  for (const instr of ALL_INSTRUMENTS) {
    if (!instrumentCounts[instr] || instrumentCounts[instr] < 1) {
      needed.push(instr);
    }
  }

  res.json({
    waitingSolos: solos.length,
    instrumentCounts,
    needed,
    readyToMerge: needed.length === 0
  });
});

// Get stats for end-of-night summary
app.get("/api/stats", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as cnt FROM participants").get().cnt;
  const played = db.prepare("SELECT COUNT(DISTINCT position) as cnt FROM participants WHERE status = 'played'").get().cnt;
  const missing = db.prepare("SELECT COUNT(DISTINCT position) as cnt FROM participants WHERE status = 'missing'").get().cnt;
  const waiting = db.prepare("SELECT COUNT(DISTINCT position) as cnt FROM participants WHERE status = 'waiting'").get().cnt;
  const groups = db.prepare("SELECT COUNT(DISTINCT group_name) as cnt FROM participants WHERE group_name IS NOT NULL").get().cnt;
  const instruments = db.prepare("SELECT instrument, COUNT(*) as cnt FROM participants GROUP BY instrument ORDER BY cnt DESC").all();

  // Extract song titles from JSON song data and count them
  const rawSongs = db.prepare("SELECT song FROM participants WHERE song IS NOT NULL AND song != ''").all();
  const songCounts = {};
  for (const row of rawSongs) {
    let titles = [];
    try {
      const parsed = JSON.parse(row.song);
      if (Array.isArray(parsed)) {
        titles = parsed.map(item => typeof item === "string" ? item : item.song);
      }
    } catch (e) {
      titles = [row.song];
    }
    for (const title of titles) {
      songCounts[title] = (songCounts[title] || 0) + 1;
    }
  }
  const songs = Object.entries(songCounts)
    .map(([song, cnt]) => ({ song, cnt }))
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 10);

  res.json({
    totalMusicians: total,
    groupsFormed: groups,
    played,
    missing,
    waiting,
    instruments,
    topSongs: songs
  });
});

// Register individual
app.post("/api/register/individual", (req, res) => {
  const { name, instrument, song, songObj } = req.body;
  if (!name || !instrument) {
    return res.status(400).json({ error: "Name and instrument required" });
  }

  // Normalize song into JSON array of {song, key}. Backward compat with plain `song`.
  let songData = null;
  let songTitle = null;
  if (songObj && songObj.song) {
    songData = JSON.stringify([{ song: songObj.song, key: songObj.key || "Original Version" }]);
    songTitle = songObj.song;
  } else if (song && song.trim() !== "") {
    songData = JSON.stringify([{ song: song.trim(), key: "Original Version" }]);
    songTitle = song.trim();
  }

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), 0) as max FROM participants")
    .get();
  const position = maxPos.max + 1;

  db.prepare(
    "INSERT INTO participants (name, instrument, song, entry_type, position) VALUES (?, ?, ?, 'individual', ?)"
  ).run(name, instrument, songData, position);

  // --- Auto-grouping logic ---
  // If solo chose a song, try to join a waiting group that has the same song and needs this instrument
  let joinedBySong = false;
  if (songTitle) {
    joinedBySong = trySongMatchJoin(position, songTitle, instrument);
  }

  // If not joined by song match, try forming a new group from solos
  const autoGroupResult = joinedBySong ? null : tryAutoGroup();

  // Move incomplete groups to the bottom
  reorderIncompleteGroups();

  broadcastUpdate();
  res.json({ success: true, position, autoGrouped: autoGroupResult });
});

// Register group
app.post("/api/register/group", (req, res) => {
  const { groupName, members, song, songs, songObjs } = req.body;
  if (!groupName || !members || !members.length) {
    return res
      .status(400)
      .json({ error: "Group name and at least one member required" });
  }

  // Normalize songs into array of {song, key}.
  // songObjs = new format; songs = array of strings (legacy); song = single string (legacy)
  let songList = [];
  if (songObjs && songObjs.length) {
    songList = songObjs
      .filter((o) => o && o.song && o.song.trim() !== "")
      .map((o) => ({ song: o.song.trim(), key: (o.key || "Original Version").trim() || "Original Version" }));
  } else if (songs && songs.length) {
    songList = songs.filter((s) => s && s.trim() !== "").map((s) => ({ song: s.trim(), key: "Original Version" }));
  } else if (song && song.trim() !== "") {
    songList = [{ song: song.trim(), key: "Original Version" }];
  }
  songList = songList.slice(0, 4);

  if (songList.length > 0 && songList.length < 2) {
    return res.status(400).json({ error: "Groups must choose between 2 and 4 songs" });
  }

  const songValue = songList.length ? JSON.stringify(songList) : null;

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), 0) as max FROM participants")
    .get();
  const position = maxPos.max + 1;

  const stmt = db.prepare(
    "INSERT INTO participants (group_name, name, instrument, song, entry_type, position) VALUES (?, ?, ?, ?, 'group', ?)"
  );

  const insertMany = db.transaction((members) => {
    for (const m of members) {
      stmt.run(groupName, m.name, m.instrument, songValue, position);
    }
  });
  insertMany(members);

  broadcastUpdate();
  res.json({ success: true, position });
});

// --- Admin endpoints (PIN protected) ---

// Delete a participant (if group member, deletes entire group at that position)
app.delete("/api/queue/:id", requirePin, (req, res) => {
  const { id } = req.params;
  const participant = db
    .prepare("SELECT * FROM participants WHERE id = ?")
    .get(id);

  if (!participant) {
    return res.status(404).json({ error: "Not found" });
  }

  if (participant.entry_type === "group") {
    // Delete entire group at this position
    db.prepare(
      "DELETE FROM participants WHERE position = ? AND group_name = ?"
    ).run(participant.position, participant.group_name);
  } else {
    db.prepare("DELETE FROM participants WHERE id = ?").run(id);
  }

  // Recompact positions
  recompactPositions();
  broadcastUpdate();
  res.json({ success: true });
});

// Move position up
app.patch("/api/queue/:position/move-up", requirePin, (req, res) => {
  const position = parseInt(req.params.position);
  if (position <= 1) {
    return res.status(400).json({ error: "Already at the top" });
  }

  // Find the position directly above
  const above = db
    .prepare(
      "SELECT DISTINCT position FROM participants WHERE position < ? ORDER BY position DESC LIMIT 1"
    )
    .get(position);

  if (!above) {
    return res.status(400).json({ error: "Already at the top" });
  }

  // Swap positions
  const swapPositions = db.transaction(() => {
    db.prepare(
      "UPDATE participants SET position = -1 WHERE position = ?"
    ).run(position);
    db.prepare(
      "UPDATE participants SET position = ? WHERE position = ?"
    ).run(position, above.position);
    db.prepare(
      "UPDATE participants SET position = ? WHERE position = -1"
    ).run(above.position);
  });
  swapPositions();

  broadcastUpdate();
  res.json({ success: true });
});

// Move position down
app.patch("/api/queue/:position/move-down", requirePin, (req, res) => {
  const position = parseInt(req.params.position);

  // Find the position directly below
  const below = db
    .prepare(
      "SELECT DISTINCT position FROM participants WHERE position > ? ORDER BY position ASC LIMIT 1"
    )
    .get(position);

  if (!below) {
    return res.status(400).json({ error: "Already at the bottom" });
  }

  // Swap positions
  const swapPositions = db.transaction(() => {
    db.prepare(
      "UPDATE participants SET position = -1 WHERE position = ?"
    ).run(position);
    db.prepare(
      "UPDATE participants SET position = ? WHERE position = ?"
    ).run(position, below.position);
    db.prepare(
      "UPDATE participants SET position = ? WHERE position = -1"
    ).run(below.position);
  });
  swapPositions();

  broadcastUpdate();
  res.json({ success: true });
});

// Set status (played / missing) for a position
app.patch("/api/queue/:position/status", requirePin, (req, res) => {
  const position = parseInt(req.params.position);
  const { status } = req.body;

  if (!["played", "missing", "waiting"].includes(status)) {
    return res.status(400).json({ error: "Status must be played, missing, or waiting" });
  }

  db.prepare("UPDATE participants SET status = ? WHERE position = ?").run(
    status,
    position
  );

  broadcastUpdate();
  res.json({ success: true });
});

// Edit songs for a position (public — anyone can correct a mistake)
app.patch("/api/queue/:position/songs", (req, res) => {
  const position = parseInt(req.params.position);
  const { songObjs } = req.body;

  const members = db
    .prepare("SELECT * FROM participants WHERE position = ? AND status = 'waiting'")
    .all(position);

  if (!members.length) {
    return res.status(404).json({ error: "Position not found or already played" });
  }

  const isGroup = members.length > 1 || members[0].group_name;

  // Normalize songs
  let songList = (songObjs || [])
    .filter((o) => o && o.song && o.song.trim() !== "")
    .map((o) => ({ song: o.song.trim(), key: (o.key || "Original Version").trim() || "Original Version" }))
    .slice(0, 4);

  // Groups need 2-4 songs (or 0 to clear); solos need 0-1
  if (isGroup && songList.length === 1) {
    return res.status(400).json({ error: "Groups must choose between 2 and 4 songs" });
  }
  if (!isGroup && songList.length > 1) {
    songList = songList.slice(0, 1);
  }

  const songValue = songList.length ? JSON.stringify(songList) : null;

  db.prepare("UPDATE participants SET song = ? WHERE position = ?").run(songValue, position);

  broadcastUpdate();
  res.json({ success: true });
});

// Reset entire queue
app.delete("/api/queue", requirePin, (req, res) => {
  db.prepare("DELETE FROM participants").run();
  broadcastUpdate();
  res.json({ success: true });
});

// Repeat sign-up — re-queue someone who already played
app.post("/api/register/repeat", (req, res) => {
  const { name, instrument, song } = req.body;
  if (!name || !instrument) {
    return res.status(400).json({ error: "Name and instrument required" });
  }

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), 0) as max FROM participants")
    .get();
  const position = maxPos.max + 1;

  db.prepare(
    "INSERT INTO participants (name, instrument, song, entry_type, position) VALUES (?, ?, ?, 'individual', ?)"
  ).run(name, instrument, song || null, position);

  // Try forming a new group from solos
  const autoGroupResult = tryAutoGroup();

  broadcastUpdate();
  res.json({ success: true, position });
});

// Join an existing position (for "join artist" button in queue)
app.post("/api/register/join/:position", (req, res) => {
  const targetPosition = parseInt(req.params.position);
  const { name, instrument } = req.body;

  if (!name || !instrument) {
    return res.status(400).json({ error: "Name and instrument required" });
  }

  // Get members at this position
  const members = db
    .prepare("SELECT * FROM participants WHERE position = ? AND status = 'waiting'")
    .all(targetPosition);

  if (!members.length) {
    return res.status(404).json({ error: "Position not found or already played" });
  }

  // Check instrument limits
  const normalizedInstr = normalizeInstrument(instrument);
  const currentCount = members.filter(
    (m) => normalizeInstrument(m.instrument) === normalizedInstr
  ).length;
  const max = getMaxForInstrument(normalizedInstr);

  if (currentCount >= max) {
    return res.status(400).json({ error: "Instrument limit reached for this group" });
  }

  const first = members[0];
  const groupName = first.group_name || first.name + "'s Jam";

  // If this was a solo, convert it to a group first
  if (!first.group_name) {
    db.prepare(
      "UPDATE participants SET group_name = ?, entry_type = 'group' WHERE id = ?"
    ).run(groupName, first.id);
  }

  // Insert the new member into the same position and group
  db.prepare(
    "INSERT INTO participants (group_name, name, instrument, song, entry_type, position, status) VALUES (?, ?, ?, ?, 'group', ?, 'waiting')"
  ).run(groupName, name, instrument, first.song, targetPosition);

  // Check if group is now complete and reorder
  reorderIncompleteGroups();

  broadcastUpdate();
  res.json({ success: true, position: targetPosition, groupName });
});

// --- Auto-grouping logic ---
// Instrument normalization map (all translations → English key)
const INSTRUMENT_NORMALIZE = {
  // English
  "guitar": "Guitar", "bass": "Bass", "drums": "Drums",
  "vocals": "Vocals", "keyboards": "Keyboards", "harmonica": "Harmonica", "other": "Other",
  // Spanish
  "guitarra": "Guitar", "bajo": "Bass", "batería": "Drums", "bateria": "Drums",
  "voz": "Vocals", "teclados": "Keyboards", "armónica": "Harmonica", "armonica": "Harmonica", "otro": "Other",
  // Russian
  "гитара": "Guitar", "бас": "Bass", "ударные": "Drums",
  "вокал": "Vocals", "клавишные": "Keyboards", "губная гармошка": "Harmonica", "другое": "Other",
  // Polish
  "gitara": "Guitar", "bas": "Bass", "perkusja": "Drums",
  "wokal": "Vocals", "klawisze": "Keyboards", "harmonijka": "Harmonica", "inne": "Other",
  // Chinese
  "吉他": "Guitar", "贝斯": "Bass", "鼓": "Drums",
  "人声": "Vocals", "键盘": "Keyboards", "口琴": "Harmonica", "其他": "Other",
  // Japanese
  "ギター": "Guitar", "ベース": "Bass", "ドラム": "Drums",
  "ボーカル": "Vocals", "キーボード": "Keyboards", "ハーモニカ": "Harmonica", "その他": "Other"
};

function normalizeInstrument(instr) {
  if (!instr) return instr;
  const key = instr.toLowerCase().trim();
  return INSTRUMENT_NORMALIZE[key] || instr;
}

// Required instruments to form a band (at least these three)
const REQUIRED_INSTRUMENTS = ["Guitar", "Bass", "Drums"];

// Max allowed per instrument in a single group
const MAX_PER_INSTRUMENT = {
  "Guitar": 2,
  // All others default to 1
};

function getMaxForInstrument(instr) {
  return MAX_PER_INSTRUMENT[instr] || 1;
}

/**
 * When a solo with a song registers, check if there's a waiting group
 * with the same song that needs this instrument. If so, add the solo to that group.
 */
function trySongMatchJoin(soloPosition, song, instrument) {
  const normalizedInstr = normalizeInstrument(instrument);
  const max = getMaxForInstrument(normalizedInstr);

  // Normalize song for comparison (handle JSON arrays and plain strings)
  const soloSongLower = song.toLowerCase();

  // Find all waiting groups/entries with a song
  const positions = db
    .prepare(
      "SELECT DISTINCT position FROM participants WHERE status = 'waiting' AND song IS NOT NULL AND song != '' AND position != ?"
    )
    .all(soloPosition);

  for (const { position } of positions) {
    const members = db
      .prepare("SELECT * FROM participants WHERE position = ?")
      .all(position);

    const first = members[0];
    if (!first.song) continue;

    // Check if songs match (song data is JSON array of {song, key} objects)
    let groupSongs = [];
    try {
      const parsed = JSON.parse(first.song);
      if (Array.isArray(parsed)) {
        groupSongs = parsed.map(item =>
          (typeof item === "string" ? item : item.song).toLowerCase()
        );
      }
    } catch (e) {
      groupSongs = [first.song.toLowerCase()];
    }

    if (!groupSongs.includes(soloSongLower)) continue;

    // Songs match — check if this instrument is needed
    const currentCount = members.filter(
      (m) => normalizeInstrument(m.instrument) === normalizedInstr
    ).length;

    if (currentCount >= max) continue;

    // Match! Move the solo into this group
    const groupName = first.group_name || first.name + "'s Jam";

    // If the target was a solo, convert it to a group first
    if (!first.group_name) {
      db.prepare(
        "UPDATE participants SET group_name = ?, entry_type = 'group' WHERE id = ?"
      ).run(groupName, first.id);
    }

    // Update the new solo to join this group
    db.prepare(
      "UPDATE participants SET group_name = ?, entry_type = 'group', position = ?, song = ? WHERE position = ? AND entry_type = 'individual' AND group_name IS NULL"
    ).run(groupName, position, first.song, soloPosition);

    recompactPositions();
    console.log(`Song-matched solo (${instrument}) into "${groupName}" at position ${position} for song "${song}"`);
    return true;
  }

  return false;
}

/**
 * Check if a candidate can be added to an existing group selection
 * without violating instrument limits.
 */
function canAddToGroup(grouped, candidate) {
  const candidateInstr = normalizeInstrument(candidate.instrument);
  const currentCount = grouped.filter(
    (m) => normalizeInstrument(m.instrument) === candidateInstr
  ).length;
  return currentCount < getMaxForInstrument(candidateInstr);
}

/**
 * Check if a group selection meets the minimum requirement (Guitar + Bass + Drums)
 */
function meetsMinimum(grouped) {
  return REQUIRED_INSTRUMENTS.every((instr) =>
    grouped.some((m) => normalizeInstrument(m.instrument) === instr)
  );
}

function tryAutoGroup() {
  // Get all ungrouped solo individuals
  const solos = db
    .prepare(
      "SELECT * FROM participants WHERE entry_type = 'individual' AND group_name IS NULL ORDER BY position ASC"
    )
    .all();

  if (solos.length < REQUIRED_INSTRUMENTS.length) return null;

  // Split solos into those with a song and those without
  const withSong = solos.filter((s) => s.song && s.song.trim() !== "");
  const noSong = solos.filter((s) => !s.song || s.song.trim() === "");

  // Strategy 1: Try to form a group from people who share the same song
  const songGroups = {};
  for (const s of withSong) {
    const key = s.song.trim().toLowerCase();
    if (!songGroups[key]) songGroups[key] = [];
    songGroups[key].push(s);
  }

  // Try each song group (largest first for best chance)
  const songKeys = Object.keys(songGroups).sort(
    (a, b) => songGroups[b].length - songGroups[a].length
  );

  for (const key of songKeys) {
    const songMembers = songGroups[key];

    // For song-based groups: Guitar + Bass + Drums MUST come from same-song members
    let grouped = [];
    for (const m of songMembers) {
      if (canAddToGroup(grouped, m)) {
        grouped.push(m);
      }
    }

    // Check if the core rhythm section (Guitar+Bass+Drums) is covered by same-song members only
    const coreMetBySong = REQUIRED_INSTRUMENTS.every((instr) =>
      grouped.some((m) => normalizeInstrument(m.instrument) === instr)
    );

    if (!coreMetBySong) continue; // Skip this song — can't form a valid band

    // Core is met! Now fill extras (non-core instruments) from no-song pool
    const usedIds = new Set(grouped.map((m) => m.id));
    for (const candidate of noSong) {
      if (usedIds.has(candidate.id)) continue;
      const candidateInstr = normalizeInstrument(candidate.instrument);
      // Only add non-core instruments from no-song pool
      if (!REQUIRED_INSTRUMENTS.includes(candidateInstr) && canAddToGroup(grouped, candidate)) {
        grouped.push(candidate);
        usedIds.add(candidate.id);
      }
    }

    // Also add any same-song extras that didn't fit initially (e.g. 2nd guitar)
    // (already handled above in the first loop)

    return commitGroup(grouped, songMembers[0].song);
  }

  // Strategy 2: No song match worked — try forming from no-song solos only
  let grouped = [];
  for (const candidate of noSong) {
    if (canAddToGroup(grouped, candidate)) {
      grouped.push(candidate);
    }
  }

  if (meetsMinimum(grouped)) {
    return commitGroup(grouped, getRandomBluesSuggestion());
  }

  return null;
}

// Random blues style suggestions for no-song groups
const BLUES_STYLES = ["Slow", "Shuffle", "Texas", "Funky", "Chicago", "Delta", "Jump", "Boogie", "Minor", "Swamp", "West Coast", "Piedmont"];
const BLUES_KEYS = ["A", "B", "Bb", "C", "D", "E", "F", "G", "Am", "Bm", "Dm", "Em", "Gm"];

function getRandomBluesSuggestion() {
  const style = BLUES_STYLES[Math.floor(Math.random() * BLUES_STYLES.length)];
  const key = BLUES_KEYS[Math.floor(Math.random() * BLUES_KEYS.length)];
  return `${style} Blues in ${key}`;
}

function commitGroup(grouped, song) {
  const groupPosition = Math.min(...grouped.map((g) => g.position));
  const groupNumber = db
    .prepare(
      "SELECT COUNT(DISTINCT group_name) as cnt FROM participants WHERE group_name LIKE 'Jam Band %'"
    )
    .get();
  const groupName = `Jam Band #${(groupNumber.cnt || 0) + 1}`;

  const updateStmt = db.prepare(
    "UPDATE participants SET group_name = ?, entry_type = 'group', position = ?, song = COALESCE(?, song) WHERE id = ?"
  );

  const doGroup = db.transaction(() => {
    for (const member of grouped) {
      updateStmt.run(groupName, groupPosition, song, member.id);
    }
  });
  doGroup();

  recompactPositions();

  console.log(
    `Auto-grouped ${grouped.length} solos into "${groupName}" at position ${groupPosition}${song ? ` (song: ${song})` : ""}`
  );

  return { groupName, members: grouped.length, position: groupPosition };
}

// --- Helpers ---
function recompactPositions() {
  const positions = db
    .prepare(
      "SELECT DISTINCT position FROM participants ORDER BY position ASC"
    )
    .all();

  const update = db.prepare(
    "UPDATE participants SET position = ? WHERE position = ?"
  );

  const compact = db.transaction(() => {
    positions.forEach((row, idx) => {
      const newPos = idx + 1;
      if (row.position !== newPos) {
        update.run(newPos, row.position);
      }
    });
  });
  compact();
}

/**
 * Reorder: move incomplete groups (waiting, missing Guitar/Bass/Drums) to the bottom.
 * Complete groups and played/missing entries stay in their current order.
 */
function reorderIncompleteGroups() {
  // Get all distinct positions with their status and members
  const positions = db
    .prepare("SELECT DISTINCT position FROM participants ORDER BY position ASC")
    .all()
    .map((r) => r.position);

  const complete = [];
  const incomplete = [];

  for (const pos of positions) {
    const members = db
      .prepare("SELECT * FROM participants WHERE position = ?")
      .all(pos);

    const first = members[0];

    // Already played or missing — don't move
    if (first.status === "played" || first.status === "missing") {
      complete.push(pos);
      continue;
    }

    // Check if this position has Guitar + Bass + Drums
    const instruments = members.map((m) => normalizeInstrument(m.instrument));
    const hasRequired = REQUIRED_INSTRUMENTS.every((instr) =>
      instruments.includes(instr)
    );

    if (hasRequired) {
      complete.push(pos);
    } else {
      incomplete.push(pos);
    }
  }

  // New order: complete positions first, then incomplete
  const newOrder = [...complete, ...incomplete];

  const update = db.prepare(
    "UPDATE participants SET position = ? WHERE position = ?"
  );

  // Use negative temp positions to avoid collisions
  const reorder = db.transaction(() => {
    newOrder.forEach((oldPos, idx) => {
      update.run(-(idx + 1), oldPos);
    });
    // Now flip negatives to positives
    newOrder.forEach((_, idx) => {
      update.run(idx + 1, -(idx + 1));
    });
  });
  reorder();
}

app.listen(PORT, () => {
  console.log(`Blues Jam App running at http://localhost:${PORT}`);
  console.log(`Admin PIN: ${ADMIN_PIN}`);

  // Self-ping to prevent Render free tier from sleeping (pings every 10 minutes)
  if (process.env.RENDER_EXTERNAL_URL) {
    const url = process.env.RENDER_EXTERNAL_URL;
    setInterval(() => {
      fetch(url).catch(() => {});
      console.log(`[keep-alive] pinged ${url}`);
    }, 10 * 60 * 1000); // every 10 minutes
  }
});

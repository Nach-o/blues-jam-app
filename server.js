const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Admin PIN — change this to whatever you want
const ADMIN_PIN = process.env.ADMIN_PIN || "Admin123";

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

// --- Public endpoints ---

// Get queue
app.get("/api/queue", (req, res) => {
  const queue = db
    .prepare("SELECT * FROM participants ORDER BY position ASC, id ASC")
    .all();
  res.json(queue);
});

// Get instrument demand — what's needed to form the next band
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

  const needed = [];
  for (const instr of REQUIRED_INSTRUMENTS) {
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
  const songs = db.prepare("SELECT song, COUNT(*) as cnt FROM participants WHERE song IS NOT NULL AND song != '' GROUP BY song ORDER BY cnt DESC LIMIT 10").all();

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

  // --- Auto-grouping logic ---
  // First, try to add this solo to an existing group that hasn't played yet
  const joinedExisting = tryJoinExistingGroup();

  // If not joined an existing group, try forming a new group from solos
  const autoGroupResult = joinedExisting ? null : tryAutoGroup();

  // Move incomplete groups to the bottom
  reorderIncompleteGroups();

  broadcastUpdate();
  res.json({ success: true, position, autoGrouped: autoGroupResult, joinedExisting });
});

// Register group
app.post("/api/register/group", (req, res) => {
  const { groupName, members, song, songs } = req.body;
  if (!groupName || !members || !members.length) {
    return res
      .status(400)
      .json({ error: "Group name and at least one member required" });
  }

  // songs = array of up to 4 songs; song = single song (backward compat)
  let songList = songs || [];
  if (!songList.length && song) songList = [song];
  songList = songList.filter((s) => s && s.trim() !== "").slice(0, 4);

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

  // Try to join existing group or form new one
  const joinedExisting = tryJoinExistingGroup();
  const autoGroupResult = joinedExisting ? null : tryAutoGroup();

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
 * Try to add ungrouped solo musicians to existing groups that haven't played yet,
 * respecting instrument limits.
 */
function tryJoinExistingGroup() {
  // Get ungrouped solos (no group_name, individual)
  const solos = db
    .prepare(
      "SELECT * FROM participants WHERE entry_type = 'individual' AND group_name IS NULL ORDER BY position ASC"
    )
    .all();

  if (solos.length === 0) return null;

  // Get existing groups that are still waiting (not played, not missing)
  const waitingGroups = db
    .prepare(
      "SELECT DISTINCT group_name, position FROM participants WHERE entry_type = 'group' AND group_name IS NOT NULL AND status = 'waiting' ORDER BY position ASC"
    )
    .all();

  if (waitingGroups.length === 0) return null;

  let anyJoined = false;

  for (const group of waitingGroups) {
    // Get current members of this group
    const members = db
      .prepare("SELECT * FROM participants WHERE group_name = ? AND position = ?")
      .all(group.group_name, group.position);

    // Try to add each solo to this group
    for (const solo of solos) {
      if (solo.group_name) continue; // already joined somewhere in this loop

      const soloInstr = normalizeInstrument(solo.instrument);
      const currentCount = members.filter(
        (m) => normalizeInstrument(m.instrument) === soloInstr
      ).length;
      const max = getMaxForInstrument(soloInstr);

      if (currentCount < max) {
        // Can join! Update the solo to become part of this group
        db.prepare(
          "UPDATE participants SET group_name = ?, entry_type = 'group', position = ? WHERE id = ?"
        ).run(group.group_name, group.position, solo.id);

        // Mark in-memory so we don't try to add them again
        solo.group_name = group.group_name;
        members.push(solo);
        anyJoined = true;
      }
    }
  }

  if (anyJoined) {
    recompactPositions();
    return true;
  }

  return null;
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

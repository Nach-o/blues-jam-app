const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Admin PIN — change this to whatever you want
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

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
  if (pin === ADMIN_PIN) {
    res.json({ success: true });
  } else {
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

// Register individual
app.post("/api/register/individual", (req, res) => {
  const { name, instrument } = req.body;
  if (!name || !instrument) {
    return res.status(400).json({ error: "Name and instrument required" });
  }

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), 0) as max FROM participants")
    .get();
  const position = maxPos.max + 1;

  db.prepare(
    "INSERT INTO participants (name, instrument, entry_type, position) VALUES (?, ?, 'individual', ?)"
  ).run(name, instrument, position);

  broadcastUpdate();
  res.json({ success: true, position });
});

// Register group
app.post("/api/register/group", (req, res) => {
  const { groupName, members } = req.body;
  if (!groupName || !members || !members.length) {
    return res
      .status(400)
      .json({ error: "Group name and at least one member required" });
  }

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), 0) as max FROM participants")
    .get();
  const position = maxPos.max + 1;

  const stmt = db.prepare(
    "INSERT INTO participants (group_name, name, instrument, entry_type, position) VALUES (?, ?, ?, 'group', ?)"
  );

  const insertMany = db.transaction((members) => {
    for (const m of members) {
      stmt.run(groupName, m.name, m.instrument, position);
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

// Reset entire queue
app.delete("/api/queue", requirePin, (req, res) => {
  db.prepare("DELETE FROM participants").run();
  broadcastUpdate();
  res.json({ success: true });
});

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

app.listen(PORT, () => {
  console.log(`Blues Jam App running at http://localhost:${PORT}`);
  console.log(`Admin PIN: ${ADMIN_PIN}`);
});

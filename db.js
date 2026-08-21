const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "jam.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT,
    name TEXT NOT NULL,
    instrument TEXT NOT NULL,
    song TEXT,
    status TEXT DEFAULT 'waiting',
    entry_type TEXT NOT NULL CHECK(entry_type IN ('individual', 'group')),
    position INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: add song column if missing (existing deployments)
try {
  db.exec("ALTER TABLE participants ADD COLUMN song TEXT");
} catch (e) {
  // Column already exists, ignore
}

// Migration: add status column if missing
try {
  db.exec("ALTER TABLE participants ADD COLUMN status TEXT DEFAULT 'waiting'");
} catch (e) {
  // Column already exists, ignore
}

module.exports = db;

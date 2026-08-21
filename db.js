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
    entry_type TEXT NOT NULL CHECK(entry_type IN ('individual', 'group')),
    position INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;

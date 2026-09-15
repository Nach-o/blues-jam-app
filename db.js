const { Pool } = require("pg");

// Postgres connection. On Render, set DATABASE_URL to the Internal Database URL
// of your Postgres instance. Locally you can point it at any Postgres.
// SSL is required by Render's managed Postgres when connecting externally;
// we enable it whenever DATABASE_URL is set and not an obvious localhost URL.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "FATAL: DATABASE_URL is not set. Set it to your Postgres connection string " +
      "(on Render, use the database's Internal Database URL)."
  );
  process.exit(1);
}

const isLocal =
  /localhost|127\.0\.0\.1/.test(connectionString) ||
  process.env.PGSSLMODE === "disable";

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});

// --- Query helpers ---

// Run a query, return the full result rows.
async function all(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// Run a query, return the first row (or undefined).
async function one(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0];
}

// Run a statement that doesn't need rows back. Returns the pg result.
async function run(text, params) {
  return pool.query(text, params);
}

// Run a set of statements inside a single transaction. The callback receives a
// dedicated client with .query() and MUST use it for every statement.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// --- Schema init ---
// Creates the participants table if it doesn't exist. Called once at startup.
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      group_name TEXT,
      name TEXT NOT NULL,
      instrument TEXT NOT NULL,
      song TEXT,
      status TEXT DEFAULT 'waiting',
      entry_type TEXT NOT NULL CHECK (entry_type IN ('individual', 'group')),
      position INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  console.log("Postgres schema ready.");
}

module.exports = { pool, all, one, run, tx, init };

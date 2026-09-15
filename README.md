# Stardust Jam App

Sign-up and live queue app for the jam session, with QR sign-up, auto-grouping,
and an admin panel. Blues/Jazz mode switch included.

## Data persistence

The app stores the queue in **PostgreSQL** (via the `pg` driver). This replaced
the previous SQLite setup, which lived on Render's ephemeral disk and was wiped
whenever the instance slept, restarted, or redeployed — causing the queue to be
lost mid-event. Postgres is managed and durable, so the queue now survives all
of those.

The schema (a single `participants` table) is created automatically on startup
by `db.init()` in `db.js`. There are no migration files to run.

## Environment variables

| Variable              | Required | Description                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`        | yes      | Postgres connection string. On Render, use the DB's **Internal Database URL**. |
| `ADMIN_PIN`           | no       | PIN for the admin panel. Defaults to `Admin123` — change it in production.   |
| `PGSSLMODE`           | no       | Set to `disable` for a local Postgres without SSL.                          |
| `RENDER_EXTERNAL_URL` | no       | Set by Render; enables the keep-alive self-ping.                            |

See `.env.example`.

## Run locally

1. Install dependencies:
   ```
   npm install
   ```
2. Start a local Postgres and create a database (e.g. `blues_jam`).
3. Copy `.env.example` to `.env` and set `DATABASE_URL` (add `PGSSLMODE=disable`
   for a local server without SSL).
4. Start:
   ```
   npm start
   ```
   The app reads `DATABASE_URL` from the environment. On Windows PowerShell you
   can run a one-off with:
   ```
   $env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/blues_jam"; $env:PGSSLMODE="disable"; npm start
   ```

## Deploy on Render

1. **Create the database.** In the Render dashboard: **New + → PostgreSQL**.
   Pick a name and region (use the same region as the web service). The free
   plan is fine to start.
2. **Copy the connection string.** Open the new database → **Connections** →
   copy the **Internal Database URL** (internal = same-region, no egress, faster).
3. **Point the web service at it.** Open the `blues-jam-app` web service →
   **Environment** → add:
   - `DATABASE_URL` = the Internal Database URL from step 2
   - `ADMIN_PIN` = your chosen PIN (optional but recommended)
4. **Deploy.** Save the env vars (Render redeploys), or push to `main` to trigger
   a build. On boot, `db.init()` creates the `participants` table automatically.
5. **Verify.** Visit `/api/queue` — it should return `[]` (empty array), not an
   error. Sign someone up, then restart the service from the dashboard and load
   `/api/queue` again: the entry should still be there.

> Note: the free Postgres plan on Render has a limited retention/expiry window.
> For a long-lived deployment, check the plan's expiry policy and upgrade if you
> need the database to persist indefinitely.

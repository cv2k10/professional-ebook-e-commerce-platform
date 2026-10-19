// Applies ./migrations/*.sql to the local D1 database used by `npm run dev`.
//
// `cf d1 migrations apply --local` needs a database UUID, but the DB binding in
// cloudflare.config.ts is declared by name only (Cloudflare provisions it on first
// deploy), so locally there is no UUID to pass. This script writes directly to the
// local D1 SQLite file instead, using the same `d1_migrations` bookkeeping table as
// Wrangler/cf so the remote `cf d1 migrations apply <id>` sees the same history.
//
// Run `npm run dev` once first so the local database file exists.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const d1Dir = path.join(root, ".cloudflare/state/v3/d1/miniflare-D1DatabaseObject");
const migrationsDir = path.join(root, "migrations");

if (!existsSync(d1Dir)) {
  console.error("No local D1 state found. Start `npm run dev` once, then rerun this script.");
  process.exit(1);
}
const files = readdirSync(d1Dir).filter((f) => /^[0-9a-f]{64}\.sqlite$/.test(f));
if (files.length !== 1) {
  console.error(`Expected exactly one local D1 database in ${d1Dir}, found ${files.length}.`);
  process.exit(1);
}

const db = new DatabaseSync(path.join(d1Dir, files[0]));
db.exec("PRAGMA busy_timeout = 5000");
db.exec(`CREATE TABLE IF NOT EXISTS d1_migrations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`);
const applied = new Set(db.prepare("SELECT name FROM d1_migrations").all().map((row) => row.name));
const pending = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql") && !applied.has(f)).sort();

if (!pending.length) {
  console.log("Local D1 is up to date.");
} else {
  for (const name of pending) {
    const sql = readFileSync(path.join(migrationsDir, name), "utf8").replaceAll("--> statement-breakpoint", "");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?)").run(name);
      db.exec("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      db.exec("ROLLBACK");
      console.error(`Failed on ${name}:`, error.message);
      process.exit(1);
    }
  }
}
db.close();

import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

const databasePath = resolve(process.cwd(), "data", "veles.db")

function initializeDatabase(connection: Database.Database): Database.Database {
  connection.pragma("journal_mode = WAL")
  connection.pragma("foreign_keys = ON")

  connection.exec(`
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'TemPolor v3.5',
  language TEXT NOT NULL DEFAULT 'English',
  status TEXT NOT NULL DEFAULT 'pending',
  item_ids TEXT,
  audio_url TEXT,
  audio_hi_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`)

  return connection
}

type DbGlobal = {
  __velesDb?: Database.Database
}

const globalForDb = globalThis as typeof globalThis & DbGlobal

mkdirSync(dirname(databasePath), { recursive: true })

export const db = globalForDb.__velesDb ?? initializeDatabase(new Database(databasePath))

if (!globalForDb.__velesDb) {
  globalForDb.__velesDb = db
}
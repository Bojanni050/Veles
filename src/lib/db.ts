import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const databasePath = fileURLToPath(new URL("../../data/veles.db", import.meta.url))

mkdirSync(dirname(databasePath), { recursive: true })

export const db = new Database(databasePath)

db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

db.exec(`
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
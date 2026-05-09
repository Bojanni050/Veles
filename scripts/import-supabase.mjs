import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

const SQLITE_PATH = resolve(process.cwd(), "data", "veles.db")
const BATCH_SIZE = 1000

function parseArgs() {
  const args = process.argv.slice(2)
  const values = {}

  for (const arg of args) {
    if (!arg.startsWith("--")) continue
    const [key, ...rest] = arg.slice(2).split("=")
    values[key] = rest.join("=")
  }

  return values
}

function initializeDatabase() {
  mkdirSync(dirname(SQLITE_PATH), { recursive: true })
  const db = new Database(SQLITE_PATH)

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

  return db
}

async function fetchTableRows({ baseUrl, apiKey, table, select, order }) {
  const rows = []

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const url = new URL(`${baseUrl}/rest/v1/${table}`)
    url.searchParams.set("select", select)
    if (order) {
      url.searchParams.set("order", order)
    }

    const response = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Range: `${offset}-${offset + BATCH_SIZE - 1}`,
        Prefer: "count=exact",
      },
    })

    if (!response.ok) {
      throw new Error(`Supabase request failed for ${table}: ${response.status} ${await response.text()}`)
    }

    const page = await response.json()
    rows.push(...page)

    if (page.length < BATCH_SIZE) {
      break
    }
  }

  return rows
}

async function main() {
  const args = parseArgs()
  const baseUrl = args.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const apiKey = args.key || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!baseUrl || !apiKey) {
    throw new Error("Missing Supabase credentials. Provide SUPABASE_URL and SUPABASE_ANON_KEY, or pass --url and --key.")
  }

  const db = initializeDatabase()
  const settings = await fetchTableRows({
    baseUrl,
    apiKey,
    table: "settings",
    select: "key,value",
  })
  const songs = await fetchTableRows({
    baseUrl,
    apiKey,
    table: "songs",
    select: "id,title,genre,lyrics,model,language,status,item_ids,audio_url,audio_hi_url,created_at",
    order: "created_at.desc",
  })

  const upsertSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
  const upsertSong = db.prepare(`
    INSERT INTO songs (id, title, genre, lyrics, model, language, status, item_ids, audio_url, audio_hi_url, created_at)
    VALUES (@id, @title, @genre, @lyrics, @model, @language, @status, @item_ids, @audio_url, @audio_hi_url, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      genre = excluded.genre,
      lyrics = excluded.lyrics,
      model = excluded.model,
      language = excluded.language,
      status = excluded.status,
      item_ids = excluded.item_ids,
      audio_url = excluded.audio_url,
      audio_hi_url = excluded.audio_hi_url,
      created_at = excluded.created_at
  `)

  const importSettings = db.transaction((rows) => {
    for (const row of rows) {
      upsertSetting.run({ key: row.key, value: row.value })
    }
  })
  const importSongs = db.transaction((rows) => {
    for (const row of rows) {
      upsertSong.run({
        id: Number(row.id),
        title: row.title,
        genre: row.genre,
        lyrics: row.lyrics,
        model: row.model || "TemPolor v3.5",
        language: row.language || "English",
        status: row.status || "pending",
        item_ids: row.item_ids ?? null,
        audio_url: row.audio_url ?? null,
        audio_hi_url: row.audio_hi_url ?? null,
        created_at: row.created_at,
      })
    }
  })

  importSettings(settings)
  importSongs(songs)

  console.log(`Imported ${settings.length} settings and ${songs.length} songs into ${SQLITE_PATH}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
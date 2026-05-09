import { db } from "../src/lib/db"

export type SongRecord = {
  id: number
  title: string
  genre: string
  lyrics: string
  model: string
  language: string
  status: string
  item_ids: string | null
  audio_url: string | null
  audio_hi_url: string | null
  created_at: string
}

export type SongInput = {
  title: string
  genre: string
  lyrics: string
  model: string
  language: string
  status: string
  item_ids: string | null
  audio_url: string | null
  audio_hi_url: string | null
}

const getSettingStatement = db.prepare("SELECT value FROM settings WHERE key = ?")
const upsertSettingStatement = db.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`)
const listSongsStatement = db.prepare("SELECT * FROM songs ORDER BY created_at DESC")
const insertSongStatement = db.prepare(`
  INSERT INTO songs (title, genre, lyrics, model, language, status, item_ids, audio_url, audio_hi_url)
  VALUES (@title, @genre, @lyrics, @model, @language, @status, @item_ids, @audio_url, @audio_hi_url)
`)
const getSongByIdStatement = db.prepare("SELECT * FROM songs WHERE id = ?")
const deleteSongStatement = db.prepare("DELETE FROM songs WHERE id = ?")
const updateSongByItemIdStatement = db.prepare(`
  UPDATE songs
  SET
    status = COALESCE(@status, status),
    audio_url = COALESCE(@audio_url, audio_url),
    audio_hi_url = COALESCE(@audio_hi_url, audio_hi_url)
  WHERE item_ids LIKE @item_id_pattern
`)

export function getSettingValue(key: string): string | null {
  const row = getSettingStatement.get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function saveSettingValue(key: string, value: string): void {
  upsertSettingStatement.run(key, value)
}

export function getSongs(): SongRecord[] {
  return listSongsStatement.all() as SongRecord[]
}

export function saveSong(song: SongInput): SongRecord {
  const normalizedSong: SongInput = {
    title: song.title || "Untitled",
    genre: song.genre,
    lyrics: song.lyrics,
    model: song.model || "TemPolor v3.5",
    language: song.language || "English",
    status: song.status || "pending",
    item_ids: song.item_ids ?? null,
    audio_url: song.audio_url ?? null,
    audio_hi_url: song.audio_hi_url ?? null,
  }

  const result = insertSongStatement.run(normalizedSong)
  return getSongById(Number(result.lastInsertRowid))
}

export function getSongById(id: number): SongRecord {
  const row = getSongByIdStatement.get(id) as SongRecord | undefined
  if (!row) {
    throw new Error("Song not found")
  }
  return row
}

export function removeSong(id: number): void {
  const result = deleteSongStatement.run(id)
  if (result.changes === 0) {
    throw new Error("Song not found")
  }
}

export function updateSongByItemId(
  itemId: string,
  fields: { status?: string; audio_url?: string | null; audio_hi_url?: string | null },
): number {
  const result = updateSongByItemIdStatement.run({
    status: fields.status ?? null,
    audio_url: fields.audio_url ?? null,
    audio_hi_url: fields.audio_hi_url ?? null,
    item_id_pattern: `%${itemId}%`,
  })
  return result.changes
}
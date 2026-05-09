import { db } from "../src/lib/db"
import { handleTempolorProxyPayload } from "./tempolor-proxy"

type SongInsert = {
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

type NodeRequest = {
  headers: Record<string, string | string[] | undefined>
  method?: string
  on: (event: "data", listener: (chunk: Buffer | string) => void) => void
  on: (event: "end", listener: () => void) => void
  on: (event: "error", listener: (error: Error) => void) => void
  url?: string
}

type NodeResponse = {
  end: (chunk?: string) => void
  setHeader: (name: string, value: string) => void
  statusCode: number
}

type NextFunction = () => void

type SongRow = SongInsert & {
  created_at: string
  id: number
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

async function readBody(req: NodeRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    req.on("data", (chunk) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    })
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"))
    })
    req.on("error", reject)
  })
}

function writeJson(res: NodeResponse, statusCode: number, payload: object): void {
  res.statusCode = statusCode
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

function toSongRow(id: number): SongRow {
  const row = getSongByIdStatement.get(id) as SongRow | undefined
  if (!row) {
    throw new Error("Song not found")
  }
  return row
}

async function handleSettingsRequest(req: NodeRequest, res: NodeResponse, key: string): Promise<void> {
  if (req.method === "GET") {
    const row = getSettingStatement.get(key) as { value: string } | undefined
    writeJson(res, 200, { value: row?.value ?? null })
    return
  }

  if (req.method === "PUT") {
    const rawBody = await readBody(req)
    const payload = JSON.parse(rawBody || "{}") as { value?: string }
    if (typeof payload.value !== "string") {
      writeJson(res, 400, { error: "Missing 'value' in request body" })
      return
    }

    upsertSettingStatement.run(key, payload.value)
    writeJson(res, 200, { ok: true })
    return
  }

  writeJson(res, 405, { error: "Method not allowed" })
}

async function handleSongsRequest(req: NodeRequest, res: NodeResponse, id: string | undefined): Promise<void> {
  if (req.method === "GET" && !id) {
    const rows = listSongsStatement.all() as SongRow[]
    writeJson(res, 200, { data: rows })
    return
  }

  if (req.method === "POST" && !id) {
    const rawBody = await readBody(req)
    const payload = JSON.parse(rawBody || "{}") as Partial<SongInsert>

    const song: SongInsert = {
      title: payload.title || "Untitled",
      genre: payload.genre || "",
      lyrics: payload.lyrics || "",
      model: payload.model || "TemPolor v3.5",
      language: payload.language || "English",
      status: payload.status || "pending",
      item_ids: payload.item_ids ?? null,
      audio_url: payload.audio_url ?? null,
      audio_hi_url: payload.audio_hi_url ?? null,
    }

    if (!song.genre || !song.lyrics) {
      writeJson(res, 400, { error: "Missing required song fields" })
      return
    }

    const result = insertSongStatement.run(song)
    writeJson(res, 201, { data: toSongRow(Number(result.lastInsertRowid)) })
    return
  }

  if (req.method === "DELETE" && id) {
    const numericId = Number(id)
    if (!Number.isInteger(numericId)) {
      writeJson(res, 400, { error: "Invalid song id" })
      return
    }

    deleteSongStatement.run(numericId)
    res.statusCode = 204
    res.end()
    return
  }

  writeJson(res, 405, { error: "Method not allowed" })
}

async function handleTempolorProxy(req: NodeRequest, res: NodeResponse): Promise<void> {
  if (req.method !== "POST") {
    writeJson(res, 405, { error: "Method not allowed" })
    return
  }

  const rawBody = await readBody(req)
  const payload = JSON.parse(rawBody || "{}") as { body?: object; method?: string; path?: string }
  const response = await handleTempolorProxyPayload(payload)
  const text = await response.text()

  res.statusCode = response.status
  res.setHeader("Content-Type", response.headers.get("content-type") || "application/json")
  res.end(text)
}

export async function apiMiddleware(req: NodeRequest, res: NodeResponse, next: NextFunction): Promise<void> {
  const url = new URL(req.url || "/", "http://localhost")

  if (!url.pathname.startsWith("/api/")) {
    next()
    return
  }

  try {
    if (url.pathname.startsWith("/api/settings/")) {
      const key = decodeURIComponent(url.pathname.slice("/api/settings/".length))
      await handleSettingsRequest(req, res, key)
      return
    }

    if (url.pathname === "/api/songs") {
      await handleSongsRequest(req, res, undefined)
      return
    }

    if (url.pathname.startsWith("/api/songs/")) {
      await handleSongsRequest(req, res, url.pathname.slice("/api/songs/".length))
      return
    }

    if (url.pathname === "/api/tempolor-proxy") {
      await handleTempolorProxy(req, res)
      return
    }

    writeJson(res, 404, { error: "Not found" })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    writeJson(res, 500, { error: message })
  }
}
export interface Song {
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

type SettingResponse = {
  value: string | null
}

type SongResponse = {
  data: Song
}

type SongsResponse = {
  data: Song[]
}

type TempolorResponse<T> = {
  data: T
  error?: string
}

type TempolorSongStatusItem = {
  status?: string
  audio_url?: string
  song_url?: string
  audio_hi_url?: string
  lyrics?: string
}

type TempolorSongQueryData = {
  songs?: TempolorSongStatusItem[]
  items?: TempolorSongStatusItem[]
  status?: string
  audio_url?: string
} | TempolorSongStatusItem[]

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json() as T | { error?: string }
  if (!res.ok) {
    const message = typeof data === "object" && data !== null && "error" in data
      ? data.error
      : `API error: ${res.status}`
    throw new Error(message || `API error: ${res.status}`)
  }
  return data as T
}

async function getSettingValue(key: string): Promise<string | null> {
  const res = await fetch(`/api/settings/${encodeURIComponent(key)}`)
  const data = await readJson<SettingResponse>(res)
  return data.value
}

async function saveSettingValue(key: string, value: string): Promise<void> {
  const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value }),
  })

  await readJson<{ ok: true }>(res)
}

export async function getApiKey(): Promise<string | null> {
  return getSettingValue("tempolor_api_key")
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await saveSettingValue("tempolor_api_key", apiKey)
}

export async function getSetting(key: string): Promise<string | null> {
  return getSettingValue(key)
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await saveSettingValue(key, value)
}

export async function getSongs(): Promise<Song[]> {
  const res = await fetch("/api/songs")
  const data = await readJson<SongsResponse>(res)
  return data.data
}

export async function saveSong(song: Omit<Song, "id" | "created_at">): Promise<Song> {
  const res = await fetch("/api/songs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(song),
  })
  const data = await readJson<SongResponse>(res)
  return data.data
}

export async function deleteSong(id: number): Promise<void> {
  const res = await fetch(`/api/songs/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const data = await res.json() as { error?: string }
      if (data.error) message = data.error
    } catch {
      // response body is empty or not valid JSON — fall through with status message
    }
    throw new Error(message)
  }
}

const PROXY_URL = "/api/tempolor-proxy"

async function tempolorFetch<T>(path: string, body: object, method = "POST"): Promise<TempolorResponse<T>> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, body, method }),
  })

  const payload = await readJson<TempolorResponse<T>>(res)

  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    throw new Error(payload.error)
  }

  if (payload.data === null || payload.data === undefined) {
    throw new Error("Tempolor returned empty response data.")
  }

  return payload
}

function getItemIdsFromResponse(data: { item_ids?: string[] } | null | undefined): string[] {
  if (!data || !Array.isArray(data.item_ids) || data.item_ids.length === 0) {
    throw new Error("Tempolor did not return any item IDs.")
  }

  return data.item_ids
}

export function parseItemIds(raw: string | null): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

function shouldRetryMissingItemIds(error: unknown): boolean {
  return error instanceof Error && error.message === "Tempolor did not return any item IDs."
}

async function runWithMissingItemIdsRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await operation()
  } catch (error: unknown) {
    if (retries > 0 && shouldRetryMissingItemIds(error)) {
      return runWithMissingItemIdsRetry(operation, retries - 1)
    }
    throw error
  }
}

export async function testApiKey(): Promise<void> {
  await tempolorFetch<{ balance: number }>("/open-apis/v1/account/billing", {})
}

export async function getBalance(): Promise<number> {
  const res = await tempolorFetch<{ balance: number }>("/open-apis/v1/account/billing", {})
  return res.data.balance
}

export async function generateLyrics(prompt: string, model: string) {
  return runWithMissingItemIdsRetry(async () => {
    const res = await tempolorFetch<{ item_ids: string[] }>("/open-apis/v1/lyrics/generate", { prompt, model })
    return getItemIdsFromResponse(res.data)
  })
}

export async function generateSong(prompt: string, lyrics: string, model: string, voiceId?: string) {
  const body: Record<string, string> = { prompt, lyrics, model }
  if (voiceId) body.voice_id = voiceId
  return runWithMissingItemIdsRetry(async () => {
    const res = await tempolorFetch<{ item_ids: string[] }>("/open-apis/v1/song/generate", body)
    return getItemIdsFromResponse(res.data)
  })
}

export interface QueryResult {
  status: string
  audio_url?: string
  audio_hi_url?: string
  lyrics?: string
}

export async function querySongStatus(itemIds: string[]): Promise<QueryResult> {
  const res = await tempolorFetch<TempolorSongQueryData>("/open-apis/v1/song/query", { item_ids: itemIds })
  if (res.data === null || res.data === undefined) {
    return { status: "pending" }
  }
  const items = Array.isArray(res.data)
    ? res.data
    : res.data.songs ?? res.data.items ?? []
  if (Array.isArray(items) && items.length > 0) {
    const item = items[0]
    return {
      status: item.status ?? "pending",
      audio_url: item.audio_url ?? item.song_url,
      audio_hi_url: item.audio_hi_url,
      lyrics: item.lyrics,
    }
  }
  if (!Array.isArray(res.data)) {
    return { status: res.data.status ?? "pending", audio_url: res.data.audio_url }
  }
  return { status: "pending" }
}

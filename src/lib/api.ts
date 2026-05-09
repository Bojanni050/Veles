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
  status?: number
  data?: T
  error?: string
  item_ids?: string[]
  success?: boolean
  message?: string
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

type TempolorLyricsStatusItem = {
  status?: string
  lyric?: string
  lyrics?: string
}

type TempolorLyricsQueryData = {
  lyrics?: TempolorLyricsStatusItem[]
}

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
const SUNO_PROXY_URL = "/api/suno-proxy"
const POLL_INTERVAL_MS = 30000
const MAX_POLL_ATTEMPTS = 20

type SunoEnvelope<T> = {
  code?: number
  msg?: string
  data?: T
}

type SunoGenerateResponse = {
  taskId?: string
}

export type SunoStatusSunoItem = {
  audioUrl?: string
  prompt?: string
  imageUrl?: string
}

type SunoStatusResponseData = {
  status?: string
  response?: {
    sunoData?: SunoStatusSunoItem[]
  }
}

type SunoBalanceResponseData = {
  remainingCredits?: number
  remaining_credits?: number
  credits?: number
  balance?: number
}

async function tempolorFetch<T>(path: string, body: object, method = "POST"): Promise<TempolorResponse<T>> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, body, method }),
  })

  const rawBody = await res.text()
  let payload: TempolorResponse<T> | null = null

  if (rawBody.trim().length > 0) {
    try {
      payload = JSON.parse(rawBody) as TempolorResponse<T>
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.error("[tempolorFetch] Unparseable response body:", rawBody)
      }
      throw new Error("Tempolor returned empty response data.")
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[tempolorFetch] Raw payload:", payload)
  }

  if (payload === null) {
    throw new Error("Tempolor returned empty response data.")
  }

  if (!res.ok) {
    const upstreamError = payload.error || payload.message || `Tempolor request failed with HTTP ${res.status}`
    throw new Error(upstreamError)
  }

  if (typeof payload.status === "number" && payload.status !== 200000) {
    throw new Error(payload.message || `Tempolor error status: ${payload.status}`)
  }

  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    throw new Error(payload.error)
  }

  if (payload.success === false && typeof payload.message === "string" && payload.message.trim().length > 0) {
    throw new Error(payload.message)
  }

  if ((payload.data === null || payload.data === undefined) && Array.isArray(payload.item_ids)) {
    payload = { ...payload, data: payload as unknown as T }
  }

  if (payload.data === null || payload.data === undefined) {
    throw new Error("Tempolor returned empty response data.")
  }

  return payload
}

async function sunoFetch<T>(
  path: string,
  body?: object,
  method = "POST",
  queryParams?: Record<string, string>,
): Promise<T> {
  const normalizedMethod = method.toUpperCase()
  const payload = normalizedMethod === "GET"
    ? { path, queryParams, method: "GET" }
    : { path, body: body || {}, method: normalizedMethod }

  const res = await fetch(SUNO_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const envelope = await readJson<SunoEnvelope<T>>(res)

  if (typeof envelope.code === "number" && envelope.code !== 200) {
    throw new Error(envelope.msg || `Suno API error code: ${envelope.code}`)
  }

  if (envelope.data === null || envelope.data === undefined) {
    throw new Error("Suno API returned empty response data.")
  }

  return envelope.data
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

async function getCallbackUrl(path: string): Promise<string> {
  const base = await getSettingValue("callback_base_url")
  if (base && base.trim().length > 0) {
    return `${base.trim().replace(/\/$/, "")}${path}`
  }
  return "https://example.com/noop"
}

export async function testApiKey(): Promise<void> {
  await tempolorFetch<{ balance: number }>("/open-apis/v1/account/billing", {})
}

export async function getBalance(): Promise<number> {
  const res = await tempolorFetch<{ balance: number }>("/open-apis/v1/account/billing", {})
  return res.data.balance
}

export async function generateLyrics(prompt: string, model: string) {
  const callbackUrl = await getCallbackUrl("/api/lyrics/callback")
  const itemIds = await runWithMissingItemIdsRetry(async () => {
    const res = await tempolorFetch<{ item_ids: string[] }>("/open-apis/v1/lyrics/generate", {
      prompt,
      song_model: model,
      callback_url: callbackUrl,
    })
    return getItemIdsFromResponse(res.data)
  })

  return pollLyricsResult(itemIds)
}

export async function generateSong(prompt: string, lyrics: string, model: string, voiceId?: string) {
  const callbackUrl = await getCallbackUrl("/api/song/callback")
  const body: Record<string, string> = {
    prompt,
    lyrics,
    model,
    callback_url: callbackUrl,
  }
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

async function pollLyricsResult(itemIds: string[], maxAttempts = MAX_POLL_ATTEMPTS): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    const res = await tempolorFetch<TempolorLyricsQueryData>("/open-apis/v1/lyrics/query", { item_ids: itemIds })
    const item = res.data?.lyrics?.[0]

    if (!item) {
      continue
    }

    const status = item.status ?? "pending"
    if (status === "failed" || status === "error") {
      throw new Error("Lyrics generation failed.")
    }

    const lyricText = item.lyric ?? item.lyrics
    if (status === "succeeded" && lyricText && lyricText.trim().length > 0) {
      return lyricText
    }
  }

  throw new Error("Lyrics generation timed out before text was returned.")
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

export async function generateSunoSong(params: {
  title: string
  style: string
  prompt: string
  model: string
  instrumental: boolean
}): Promise<string> {
  const data = await sunoFetch<SunoGenerateResponse>("/api/v1/generate", {
    customMode: true,
    instrumental: params.instrumental,
    model: params.model,
    callBackUrl: "https://example.com/noop",
    prompt: params.prompt,
    style: params.style,
    title: params.title,
  })

  if (!data.taskId) {
    throw new Error("Suno did not return a taskId.")
  }

  return data.taskId
}

export async function querySunoStatus(taskId: string): Promise<{
  status: string
  audioUrl?: string
  imageUrl?: string
  lyrics?: string
  sunoData?: SunoStatusSunoItem[]
}> {
  const data = await sunoFetch<SunoStatusResponseData>(
    "/api/v1/generate/record-info",
    undefined,
    "GET",
    { taskId },
  )

  const rawStatus = data.status ?? ""
  const mappedStatus = rawStatus === "SUCCESS"
    ? "completed"
    : rawStatus === "PENDING" || rawStatus === "TEXT_SUCCESS" || rawStatus === "FIRST_SUCCESS"
      ? "pending"
      : "failed"

  const first = data.response?.sunoData?.[0]

  return {
    status: mappedStatus,
    audioUrl: rawStatus === "SUCCESS" ? first?.audioUrl : undefined,
    imageUrl: first?.imageUrl,
    lyrics: first?.prompt,
    sunoData: data.response?.sunoData,
  }
}

export async function getSunoApiKey(): Promise<string | null> {
  return getSetting("suno_api_key")
}

export async function saveSunoApiKey(key: string): Promise<void> {
  await saveSetting("suno_api_key", key)
}

export async function getGeminiApiKey(): Promise<string | null> {
  return getSetting("gemini_api_key")
}

export async function saveGeminiApiKey(key: string): Promise<void> {
  await saveSetting("gemini_api_key", key)
}

export async function generateLyriaClip(prompt: string, lyrics?: string): Promise<Blob> {
  const res = await fetch("/api/lyria-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, lyrics, model: "clip" }),
  })

  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const payload = await res.json() as { error?: string }
      if (payload.error) {
        message = payload.error
      }
    } catch {
      // Keep status-based fallback when response body is not JSON.
    }
    throw new Error(message)
  }

  return res.blob()
}

export async function generateLyriaSong(prompt: string, lyrics?: string): Promise<Blob> {
  const res = await fetch("/api/lyria-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, lyrics, model: "pro" }),
  })

  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const payload = await res.json() as { error?: string }
      if (payload.error) {
        message = payload.error
      }
    } catch {
      // Keep status-based fallback when response body is not JSON.
    }
    throw new Error(message)
  }

  return res.blob()
}

export async function getLyriaApiKey(): Promise<string | null> {
  return getSetting("gemini_api_key")
}

export async function saveLyriaApiKey(key: string): Promise<void> {
  await saveSetting("gemini_api_key", key)
}

export async function getSunoBalance(): Promise<number> {
  let data: SunoBalanceResponseData | number
  try {
    data = await sunoFetch<SunoBalanceResponseData | number>("/api/v1/generate/credit", undefined, "GET")
  } catch {
    // Backward-compatibility fallback for older Suno proxy setups.
    data = await sunoFetch<SunoBalanceResponseData | number>("/api/v1/credits/balance", undefined, "GET")
  }

  if (typeof data === "number") {
    return data
  }

  let remaining = data.remainingCredits
    ?? data.remaining_credits
    ?? data.credits
    ?? data.balance

  if (remaining === undefined || remaining === null) {
    const nested = data as unknown as {
      data?: SunoBalanceResponseData
      credit?: SunoBalanceResponseData
      credits?: SunoBalanceResponseData | number
      result?: SunoBalanceResponseData
    }

    const nestedCandidate = typeof nested.credits === "object"
      ? nested.credits
      : nested.data ?? nested.credit ?? nested.result

    if (nestedCandidate && typeof nestedCandidate === "object") {
      remaining = nestedCandidate.remainingCredits
        ?? nestedCandidate.remaining_credits
        ?? nestedCandidate.credits
        ?? nestedCandidate.balance
    }
  }

  if (typeof remaining === "string") {
    const parsed = Number(remaining)
    remaining = Number.isFinite(parsed) ? parsed : remaining
  }

  if (typeof remaining !== "number") {
    throw new Error("Suno balance response did not include remaining credits.")
  }

  return remaining
}

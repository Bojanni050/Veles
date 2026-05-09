import { supabase } from "./supabase"

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

export async function getApiKey(): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "tempolor_api_key")
    .maybeSingle()
  return data?.value ?? null
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await supabase
    .from("settings")
    .upsert({ key: "tempolor_api_key", value: apiKey })
}

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle()
  return data?.value ?? null
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await supabase.from("settings").upsert({ key, value })
}

export async function getSongs(): Promise<Song[]> {
  const { data } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false })
  return (data as Song[]) ?? []
}

export async function saveSong(song: Omit<Song, "id" | "created_at">): Promise<Song> {
  const { data, error } = await supabase
    .from("songs")
    .insert(song)
    .select()
    .single()
  if (error) throw error
  return data as Song
}

export async function deleteSong(id: number): Promise<void> {
  await supabase.from("songs").delete().eq("id", id)
}

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tempolor-proxy`

async function tempolorFetch(path: string, body: object, method = "POST") {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ path, body, method }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`)
  }
  return data
}

export async function testApiKey(): Promise<void> {
  await tempolorFetch("/open-apis/v1/account/billing", {})
}

export async function getBalance(): Promise<number> {
  const res = await tempolorFetch("/open-apis/v1/account/billing", {})
  return res.data.balance as number
}

export async function generateLyrics(prompt: string, model: string) {
  const res = await tempolorFetch("/open-apis/v1/lyrics/generate", { prompt, model })
  return res.data.item_ids as string[]
}

export async function generateSong(prompt: string, lyrics: string, model: string, voiceId?: string) {
  const body: Record<string, string> = { prompt, lyrics, model }
  if (voiceId) body.voice_id = voiceId
  const res = await tempolorFetch("/open-apis/v1/song/generate", body)
  return res.data.item_ids as string[]
}

export interface QueryResult {
  status: string
  audio_url?: string
  audio_hi_url?: string
  lyrics?: string
}

export async function querySongStatus(itemIds: string[]): Promise<QueryResult> {
  const res = await tempolorFetch("/open-apis/v1/song/query", { item_ids: itemIds })
  const items = res.data?.songs ?? res.data?.items ?? res.data
  if (Array.isArray(items) && items.length > 0) {
    const item = items[0]
    return {
      status: item.status ?? "pending",
      audio_url: item.audio_url ?? item.song_url,
      audio_hi_url: item.audio_hi_url,
      lyrics: item.lyrics,
    }
  }
  return { status: res.data?.status ?? "pending", audio_url: res.data?.audio_url }
}

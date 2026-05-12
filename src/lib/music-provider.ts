export type ProviderName = "tempolor" | "poyo"

export type GenerateLyricsResult = string[] // item IDs or task IDs
export type GenerateSongResult = string[] // item IDs or task IDs

export type QueryResult = {
  status: string
  audio_url?: string
  audio_hi_url?: string
  lyrics?: string
  cover_image_url?: string
  duration?: number
  title?: string
}

export type MusicProvider = {
  name: ProviderName
  generateLyrics: (prompt: string, model: string) => Promise<GenerateLyricsResult>
  generateSong: (
    prompt: string,
    lyrics: string,
    model: string,
    voiceId?: string
  ) => Promise<GenerateSongResult>
  queryStatus: (ids: string[]) => Promise<QueryResult>
  getBalance: () => Promise<number>
  testApiKey: () => Promise<void>
}

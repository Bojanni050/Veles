import type {
  GenerateLyricsResult,
  GenerateSongResult,
  MusicProvider,
  QueryResult,
} from "../music-provider"

const POYO_PROXY_URL = "/api/poyo-proxy"

type PoyoEnvelope<T> = {
  data?: T
  error?: string
  message?: string
}

type PoyoSubmitData = {
  task_id?: string
}

type PoyoFile = {
  audio_url?: string
  image_url?: string
  duration?: number
  title?: string
}

type PoyoDetailData = {
  status?: string
  files?: PoyoFile[]
  error_message?: string
}

async function poyoFetch<T>(
  path: string,
  method: "POST" | "GET",
  body?: object,
): Promise<PoyoEnvelope<T>> {
  const payload = method === "GET"
    ? { path, method }
    : { path, method, body: body ?? {} }

  const res = await fetch(POYO_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json: PoyoEnvelope<T> | null = null

  if (text.trim().length > 0) {
    try {
      json = JSON.parse(text) as PoyoEnvelope<T>
    } catch {
      throw new Error("PoYo returned an invalid JSON response.")
    }
  }

  if (!res.ok) {
    const statusMessage = `PoYo request failed with HTTP ${res.status}`
    const upstreamMessage = json?.error || json?.message
    throw new Error(upstreamMessage || statusMessage)
  }

  if (json === null) {
    throw new Error("PoYo returned an empty response.")
  }

  if (typeof json.error === "string" && json.error.trim().length > 0) {
    throw new Error(json.error)
  }

  return json
}

function getTaskId(data: PoyoSubmitData | undefined): string {
  const taskId = data?.task_id
  if (!taskId || taskId.trim().length === 0) {
    throw new Error("PoYo did not return a task_id.")
  }
  return taskId
}

async function generateLyrics(prompt: string): Promise<GenerateLyricsResult> {
  const response = await poyoFetch<PoyoSubmitData>("/api/generate/submit", "POST", {
    model: "generate-lyrics",
    input: { prompt },
  })

  return [getTaskId(response.data)]
}

async function generateSong(
  prompt: string,
  lyrics: string,
  voiceId?: string,
): Promise<GenerateSongResult> {
  const response = await poyoFetch<PoyoSubmitData>("/api/generate/submit", "POST", {
    model: "generate-music",
    input: {
      prompt: lyrics,
      style: prompt,
      title: "Generated Song",
      custom_mode: true,
      instrumental: false,
      mv: "V5_5",
      vocal_gender: voiceId ?? "",
    },
  })

  return [getTaskId(response.data)]
}

async function queryStatus(ids: string[]): Promise<QueryResult> {
  const taskId = ids[0]
  if (!taskId || taskId.trim().length === 0) {
    throw new Error("PoYo status query requires a task_id.")
  }

  const encodedTaskId = encodeURIComponent(taskId)
  const response = await poyoFetch<PoyoDetailData>(
    `/api/generate/detail/music?task_id=${encodedTaskId}`,
    "GET",
  )

  const data = response.data
  const status = data?.status

  if (status === "finished") {
    const file = data?.files?.[0]
    return {
      status: "finished",
      audio_url: file?.audio_url,
      cover_image_url: file?.image_url,
      duration: file?.duration,
      title: file?.title,
    }
  }

  if (status === "failed") {
    throw new Error(data?.error_message || "PoYo generation failed.")
  }

  return { status: "pending" }
}

async function getBalance(): Promise<number> {
  return 0
}

async function testApiKey(): Promise<void> {
  try {
    await poyoFetch<PoyoSubmitData>("/api/generate/submit", "POST", {
      model: "generate-lyrics",
      input: { prompt: "test" },
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      const hasAuthSignal = message.includes("auth") || message.includes("unauthorized") || message.includes("forbidden") || message.includes("api key")
      if (hasAuthSignal) {
        throw error
      }
      throw new Error(`PoYo API key test failed: ${error.message}`)
    }
    throw error
  }
}

export function createPoyoProvider(): MusicProvider {
  return {
    name: "poyo",
    generateLyrics: async (prompt: string, _model: string): Promise<GenerateLyricsResult> =>
      generateLyrics(prompt),
    generateSong: async (
      prompt: string,
      lyrics: string,
      _model: string,
      voiceId?: string,
    ): Promise<GenerateSongResult> => generateSong(prompt, lyrics, voiceId),
    queryStatus,
    getBalance,
    testApiKey,
  }
}

import { GoogleGenAI } from "@google/genai"
import { getSettingValue } from "../../../server/store"

export const runtime = "nodejs"

type LyriaPayload = {
  prompt?: string
  lyrics?: string
  model?: "pro" | "clip"
}

type InlineAudioPart = {
  inlineData?: {
    mimeType?: string
    data?: string
  }
}

function isApiRequestLoggingEnabled(): boolean {
  const value = getSettingValue("api_request_logging_enabled")
  return value === "true"
}

function logRequest(model: "pro" | "clip", promptLength: number, hasLyrics: boolean): number {
  const startTime = Date.now()
  console.log(
    `[Lyria Proxy] -> POST /generate | model=${model} | promptLength=${promptLength} | hasLyrics=${hasLyrics}`,
  )
  return startTime
}

function logResponse(status: number, bytes: number, startedAt: number): void {
  const duration = Date.now() - startedAt
  console.log(`[Lyria Proxy] <- POST /generate | status=${status} | bytes=${bytes} | durationMs=${duration}`)
}

export async function POST(request: Request): Promise<Response> {
  let payload: LyriaPayload
  try {
    payload = await request.json() as LyriaPayload
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!payload.prompt || typeof payload.prompt !== "string" || payload.prompt.trim().length === 0) {
    return Response.json({ error: "Missing 'prompt' in request body" }, { status: 400 })
  }

  if (payload.model !== "pro" && payload.model !== "clip") {
    return Response.json({ error: "Field 'model' must be 'pro' or 'clip'" }, { status: 400 })
  }

  const apiKey = getSettingValue("gemini_api_key") || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: "Gemini API key not configured" }, { status: 400 })
  }

  const modelName = payload.model === "pro" ? "lyria-3-pro-preview" : "lyria-3-clip-preview"
  const fullPrompt = payload.lyrics && payload.lyrics.trim().length > 0
    ? `${payload.prompt}\n\nLyrics:\n${payload.lyrics}`
    : payload.prompt

  const shouldLog = isApiRequestLoggingEnabled()
  const requestStartedAt = shouldLog
    ? logRequest(payload.model, payload.prompt.length, Boolean(payload.lyrics && payload.lyrics.trim().length > 0))
    : 0

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: fullPrompt }] }],
    })

    const candidates = Array.isArray(response.candidates) ? response.candidates : []
    const allParts: InlineAudioPart[] = candidates.flatMap((candidate) => {
      const parts = candidate.content?.parts
      return Array.isArray(parts) ? parts as InlineAudioPart[] : []
    })

    const audioPart = allParts.find((part) => {
      const mimeType = part.inlineData?.mimeType
      return typeof mimeType === "string" && mimeType.startsWith("audio/")
    })

    if (!audioPart?.inlineData?.data) {
      if (shouldLog) {
        logResponse(500, 0, requestStartedAt)
      }
      return Response.json({ error: "No audio generated" }, { status: 500 })
    }

    const audioBuffer = Buffer.from(audioPart.inlineData.data, "base64")

    if (shouldLog) {
      logResponse(200, audioBuffer.byteLength, requestStartedAt)
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": "attachment; filename=\"lyria-output.wav\"",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`[Lyria Proxy] ERROR: ${message}`)
    if (shouldLog) {
      logResponse(500, 0, requestStartedAt)
    }
    return Response.json({ error: message }, { status: 500 })
  }
}

import { db } from "../src/lib/db"

const TEMPOLOR_BASE = "https://api.tempolor.com"

type ProxyPayload = {
  path: string
  body?: object
  method?: string
}

function getApiKey(): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("tempolor_api_key") as { value: string } | undefined
  return row?.value ?? null
}

export async function handleTempolorProxyPayload(payload: ProxyPayload): Promise<Response> {
  if (!payload.path || typeof payload.path !== "string") {
    return Response.json({ error: "Missing 'path' in request body" }, { status: 400 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return Response.json({ error: "API key not configured. Set it in Settings." }, { status: 400 })
  }

  const httpMethod = (payload.method || "POST").toUpperCase()
  const fetchOptions: RequestInit = {
    method: httpMethod,
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
  }

  if (httpMethod !== "GET" && httpMethod !== "HEAD") {
    fetchOptions.body = JSON.stringify(payload.body || {})
  }

  const upstream = await fetch(`${TEMPOLOR_BASE}${payload.path}`, fetchOptions)
  const responseText = await upstream.text()

  return new Response(responseText, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  })
}

export async function handleTempolorProxyRequest(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as ProxyPayload
    return handleTempolorProxyPayload(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
import { getSettingValue } from "./store"

const TEMPOLOR_BASE = "https://api.tempolor.com"

type ProxyPayload = {
  path: string
  body?: object
  method?: string
}

function getApiKey(): string | null {
  return getSettingValue("tempolor_api_key")
}

function isApiRequestLoggingEnabled(): boolean {
  const value = getSettingValue("api_request_logging_enabled")
  const enabled = value === "true"
  if (!enabled && value !== null) {
    console.log(`[Tempolor Proxy] Logging disabled (setting=${value})`)
  }
  return enabled
}

function logProxyRequest(payload: ProxyPayload, method: string): number {
  const startTime = Date.now()
  const hasBody = payload.body !== undefined && payload.body !== null
  const bodyKeys = hasBody && typeof payload.body === "object"
    ? Object.keys(payload.body as Record<string, unknown>)
    : []

  console.log(
    `[Tempolor Proxy] -> ${method} ${payload.path} | hasBody=${hasBody} | bodyKeys=[${bodyKeys.join(",")}]`,
  )

  return startTime
}

function logProxyResponse(method: string, path: string, status: number, startedAt: number): void {
  const duration = Date.now() - startedAt
  console.log(`[Tempolor Proxy] <- ${method} ${path} | status=${status} | durationMs=${duration}`)
}

export async function handleTempolorProxyPayload(payload: ProxyPayload): Promise<Response> {
  console.log(`[Tempolor Proxy] Incoming request to ${payload.path}`)
  
  if (!payload.path || typeof payload.path !== "string") {
    return Response.json({ error: "Missing 'path' in request body" }, { status: 400 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    console.log("[Tempolor Proxy] ERROR: API key not configured")
    return Response.json({ error: "API key not configured. Set it in Settings." }, { status: 400 })
  }

  const httpMethod = (payload.method || "POST").toUpperCase()
  const shouldLog = isApiRequestLoggingEnabled()
  console.log(`[Tempolor Proxy] Logging is ${shouldLog ? "ENABLED" : "DISABLED"}`)
  const requestStartedAt = shouldLog ? logProxyRequest(payload, httpMethod) : 0

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

  let upstream
  let responseText
  try {
    upstream = await fetch(`${TEMPOLOR_BASE}${payload.path}`, fetchOptions)
    responseText = await upstream.text()
  } catch (fetchError: unknown) {
    const message = fetchError instanceof Error ? fetchError.message : "Unknown fetch error"
    console.error(`[Tempolor Proxy] FETCH ERROR: ${message}`)
    return Response.json({ error: `Upstream request failed: ${message}` }, { status: 502 })
  }

  if (shouldLog) {
    logProxyResponse(httpMethod, payload.path, upstream.status, requestStartedAt)
  }

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
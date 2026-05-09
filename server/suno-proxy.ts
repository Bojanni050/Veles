import { getSettingValue } from "./store"

const SUNO_BASE = "https://api.sunoapi.org"

type ProxyPayload = {
  path: string
  body?: object
  method?: string
  queryParams?: Record<string, string>
}

function getApiKey(): string | null {
  return getSettingValue("suno_api_key")
}

function isApiRequestLoggingEnabled(): boolean {
  const value = getSettingValue("api_request_logging_enabled")
  const enabled = value === "true"
  if (!enabled && value !== null) {
    console.log(`[Suno Proxy] Logging disabled (setting=${value})`)
  }
  return enabled
}

function logProxyRequest(payload: ProxyPayload, method: string, url: string): number {
  const startTime = Date.now()
  const hasBody = payload.body !== undefined && payload.body !== null
  const bodyKeys = hasBody && typeof payload.body === "object"
    ? Object.keys(payload.body as Record<string, unknown>)
    : []

  console.log(
    `[Suno Proxy] -> ${method} ${url} | hasBody=${hasBody} | bodyKeys=[${bodyKeys.join(",")}]`,
  )

  return startTime
}

function logProxyResponse(method: string, url: string, status: number, startedAt: number): void {
  const duration = Date.now() - startedAt
  console.log(`[Suno Proxy] <- ${method} ${url} | status=${status} | durationMs=${duration}`)
}

function buildUpstreamUrl(path: string, queryParams?: Record<string, string>): string {
  const upstreamUrl = new URL(`${SUNO_BASE}${path}`)
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      upstreamUrl.searchParams.set(key, value)
    }
  }
  return upstreamUrl.toString()
}

export async function handleSunoProxyPayload(payload: ProxyPayload): Promise<Response> {
  console.log(`[Suno Proxy] Incoming request to ${payload.path}`)

  if (!payload.path || typeof payload.path !== "string") {
    return Response.json({ error: "Missing 'path' in request body" }, { status: 400 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    console.log("[Suno Proxy] ERROR: Suno API key not configured")
    return Response.json({ error: "Suno API key not configured" }, { status: 400 })
  }

  const httpMethod = (payload.method || "POST").toUpperCase()
  const upstreamUrl = buildUpstreamUrl(payload.path, payload.queryParams)
  const shouldLog = isApiRequestLoggingEnabled()
  console.log(`[Suno Proxy] Logging is ${shouldLog ? "ENABLED" : "DISABLED"}`)
  const requestStartedAt = shouldLog ? logProxyRequest(payload, httpMethod, upstreamUrl) : 0

  const fetchOptions: RequestInit = {
    method: httpMethod,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  }

  if (httpMethod !== "GET" && httpMethod !== "HEAD") {
    fetchOptions.body = JSON.stringify(payload.body || {})
  }

  let upstream: Response
  let responseText: string
  try {
    upstream = await fetch(upstreamUrl, fetchOptions)
    responseText = await upstream.text()
  } catch (fetchError: unknown) {
    const message = fetchError instanceof Error ? fetchError.message : "Unknown fetch error"
    console.error(`[Suno Proxy] FETCH ERROR: ${message}`)
    return Response.json({ error: `Upstream request failed: ${message}` }, { status: 502 })
  }

  if (shouldLog) {
    logProxyResponse(httpMethod, upstreamUrl, upstream.status, requestStartedAt)
  }

  return new Response(responseText, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  })
}

export async function handleSunoProxyRequest(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as ProxyPayload
    return handleSunoProxyPayload(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

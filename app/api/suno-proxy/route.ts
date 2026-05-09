import { handleSunoProxyRequest } from "../../../server/suno-proxy"

export async function POST(request: Request): Promise<Response> {
  return handleSunoProxyRequest(request)
}

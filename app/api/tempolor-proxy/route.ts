import { handleTempolorProxyRequest } from "../../../server/tempolor-proxy"

export async function POST(request: Request): Promise<Response> {
  return handleTempolorProxyRequest(request)
}
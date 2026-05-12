import { handlePoyoProxyRequest } from "../../../server/poyo-proxy"

export async function POST(request: Request): Promise<Response> {
  return handlePoyoProxyRequest(request)
}

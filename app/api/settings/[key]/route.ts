import { NextResponse } from "next/server"
import { getSettingValue, saveSettingValue } from "../../../../server/store"

type RouteContext = {
  params: Promise<{ key: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { key } = await context.params
  return NextResponse.json({ value: getSettingValue(key) })
}

export async function PUT(request: Request, context: RouteContext) {
  const { key } = await context.params
  const payload = await request.json() as { value?: string }

  if (typeof payload.value !== "string") {
    return NextResponse.json({ error: "Missing 'value' in request body" }, { status: 400 })
  }

  saveSettingValue(key, payload.value)
  return NextResponse.json({ ok: true })
}
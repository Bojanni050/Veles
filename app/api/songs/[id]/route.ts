import { NextResponse } from "next/server"
import { removeSong } from "../../../../server/store"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid song id" }, { status: 400 })
  }

  try {
    removeSong(numericId)
  } catch (err) {
    if (err instanceof Error && err.message === "Song not found") {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }
    throw err
  }
  return new Response(null, { status: 204 })
}
import { NextResponse } from "next/server"
import { getSongs, saveSong } from "../../../server/store"

export async function GET() {
  return NextResponse.json({ data: getSongs() })
}

export async function POST(request: Request) {
  const payload = await request.json() as Partial<{
    title: string
    genre: string
    lyrics: string
    model: string
    language: string
    status: string
    item_ids: string | null
    audio_url: string | null
    audio_hi_url: string | null
  }>

  if (!payload.genre || !payload.lyrics) {
    return NextResponse.json({ error: "Missing required song fields" }, { status: 400 })
  }

  const song = saveSong({
    title: payload.title || "Untitled",
    genre: payload.genre,
    lyrics: payload.lyrics,
    model: payload.model || "TemPolor v3.5",
    language: payload.language || "English",
    status: payload.status || "pending",
    item_ids: payload.item_ids ?? null,
    audio_url: payload.audio_url ?? null,
    audio_hi_url: payload.audio_hi_url ?? null,
  })

  return NextResponse.json({ data: song }, { status: 201 })
}
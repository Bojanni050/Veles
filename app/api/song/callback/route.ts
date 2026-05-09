import { NextResponse } from "next/server"
import { updateSongByItemId } from "../../../../server/store"

type CallbackSong = {
  item_id?: string
  status?: string
  event?: string
  audio_url?: string
  audio_hi_url?: string
}

type CallbackPayload = {
  songs?: CallbackSong[]
}

export async function POST(request: Request) {
  let payload: CallbackPayload
  try {
    payload = await request.json() as CallbackPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const songs = payload.songs
  if (!Array.isArray(songs) || songs.length === 0) {
    return new Response("success", { status: 200 })
  }

  for (const song of songs) {
    if (!song.item_id) continue

    const isFinalStatus =
      song.status === "succeeded" ||
      song.status === "failed" ||
      song.status === "part_failed"

    updateSongByItemId(song.item_id, {
      status: isFinalStatus ? song.status : undefined,
      audio_url: song.audio_url ?? null,
      audio_hi_url: song.audio_hi_url ?? null,
    })
  }

  return new Response("success", { status: 200 })
}

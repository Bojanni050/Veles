"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { Song } from "@/lib/api"

type PlayerContextValue = {
  queue: Song[]
  setQueue: (songs: Song[]) => void
  currentSong: Song | null
  setCurrentSong: (song: Song | null) => void
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined)

type PlayerProviderProps = {
  children: ReactNode
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [queue, setQueue] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)

  const value = useMemo<PlayerContextValue>(() => ({
    queue,
    setQueue,
    currentSong,
    setCurrentSong,
  }), [queue, currentSong])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider")
  }
  return context
}

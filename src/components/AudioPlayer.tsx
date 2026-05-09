"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Box, Flex, HStack, IconButton, Slider, Text } from "@chakra-ui/react"
import {
  LuMusic,
  LuPause,
  LuPlay,
  LuSkipBack,
  LuSkipForward,
  LuVolume2,
  LuVolumeX,
} from "react-icons/lu"
import type { Song } from "@/lib/api"

interface AudioPlayerProps {
  song: Song | null
  songs: Song[]
  onSongChange: (song: Song) => void
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({ song, songs, onSongChange }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = muted ? 0 : volume / 100
  }, [volume, muted])

  useEffect(() => {
    if (!song?.audio_url) return
    const audio = audioRef.current
    if (!audio) return
    audio.src = song.audio_url
    audio.load()
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [song?.id, song?.audio_url])

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }, [])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    const idx = songs.findIndex((s) => s.id === song?.id)
    if (idx >= 0 && idx < songs.length - 1) {
      onSongChange(songs[idx + 1])
    }
  }, [song?.id, songs, onSongChange])

  function togglePlay() {
    if (!audioRef.current || !song?.audio_url) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  function handleSeek(details: { value: number[] }) {
    if (!audioRef.current) return
    audioRef.current.currentTime = details.value[0]
    setCurrentTime(details.value[0])
  }

  function handlePrev() {
    const idx = songs.findIndex((s) => s.id === song?.id)
    if (idx > 0) onSongChange(songs[idx - 1])
  }

  function handleNext() {
    const idx = songs.findIndex((s) => s.id === song?.id)
    if (idx >= 0 && idx < songs.length - 1) onSongChange(songs[idx + 1])
  }

  return (
    <Box
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border.muted"
      px={{ base: "4", md: "6" }}
      py="3"
      zIndex="sticky"
      backdropFilter="blur(12px)"
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <Flex align="center" gap={{ base: "3", md: "6" }} maxW="8xl" mx="auto">
        {/* Track info */}
        <HStack gap="3" minW="0" flex={{ base: "1", md: "0" }} w={{ md: "240px" }}>
          <Box
            p="2"
            rounded="md"
            bg="teal.500/10"
            flexShrink={0}
          >
            <Box as={LuMusic} boxSize="4" color="teal.400" />
          </Box>
          <Box minW="0">
            <Text fontWeight="medium" fontSize="sm" color={song ? "fg" : "fg.subtle"} truncate>
              {song ? song.title : "No track selected"}
            </Text>
            <Text fontSize="xs" color="fg.muted" truncate>
              {song ? song.genre : "Pick a song to play"}
            </Text>
          </Box>
        </HStack>

        {/* Playback controls + progress */}
        <Flex direction="column" flex="1" gap="1" display={{ base: "none", md: "flex" }}>
          <HStack justify="center" gap="1">
            <IconButton
              aria-label="Previous"
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={!song || songs.findIndex((s) => s.id === song.id) <= 0}
            >
              <LuSkipBack />
            </IconButton>
            <IconButton
              aria-label={playing ? "Pause" : "Play"}
              variant="solid"
              colorPalette="teal"
              size="sm"
              rounded="full"
              onClick={togglePlay}
              disabled={!song}
            >
              {playing ? <LuPause /> : <LuPlay />}
            </IconButton>
            <IconButton
              aria-label="Next"
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={!song || songs.findIndex((s) => s.id === song.id) >= songs.length - 1}
            >
              <LuSkipForward />
            </IconButton>
          </HStack>

          <HStack gap="2">
            <Text fontSize="xs" color="fg.subtle" w="10" textAlign="right">
              {formatTime(currentTime)}
            </Text>
            <Slider.Root
              flex="1"
              size="sm"
              colorPalette="teal"
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.5}
              onValueChange={handleSeek}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
            <Text fontSize="xs" color="fg.subtle" w="10">
              {formatTime(duration)}
            </Text>
          </HStack>
        </Flex>

        {/* Mobile play button */}
        <IconButton
          aria-label={playing ? "Pause" : "Play"}
          variant="solid"
          colorPalette="teal"
          size="sm"
          rounded="full"
          onClick={togglePlay}
          disabled={!song}
          display={{ base: "flex", md: "none" }}
        >
          {playing ? <LuPause /> : <LuPlay />}
        </IconButton>

        {/* Volume */}
        <HStack gap="2" w="140px" display={{ base: "none", lg: "flex" }}>
          <IconButton
            aria-label={muted ? "Unmute" : "Mute"}
            variant="ghost"
            size="xs"
            onClick={() => setMuted(!muted)}
          >
            {muted || volume === 0 ? <LuVolumeX /> : <LuVolume2 />}
          </IconButton>
          <Slider.Root
            flex="1"
            size="sm"
            colorPalette="teal"
            value={[muted ? 0 : volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={(d) => { setVolume(d.value[0]); setMuted(false) }}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </Slider.Root>
        </HStack>
      </Flex>
    </Box>
  )
}

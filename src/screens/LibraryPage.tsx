"use client"

import { useState, useEffect, useMemo } from "react"
import { Box, Button, Grid, Heading, HStack, Stack, Text, VStack } from "@chakra-ui/react"
import { LuDownload, LuLibrary, LuMusic, LuPlay, LuTrash2 } from "react-icons/lu"
import { getSongs, deleteSong, type Song } from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { usePlayer } from "@/lib/player-context"

function downloadFile(url: string): void {
  const link = document.createElement("a")
  link.href = url
  link.download = ""
  link.rel = "noopener"
  document.body.append(link)
  link.click()
  link.remove()
}

export function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const { currentSong, setCurrentSong, setQueue } = usePlayer()

  useEffect(() => {
    loadSongs()
  }, [])

  async function loadSongs() {
    setLoading(true)
    try {
      const data = await getSongs()
      setSongs(data)
    } finally {
      setLoading(false)
    }
  }

  const playableSongs = useMemo(() => songs.filter((s) => s.audio_url), [songs])

  useEffect(() => {
    setQueue(playableSongs)
  }, [playableSongs, setQueue])

  useEffect(() => {
    if (!currentSong) {
      return
    }

    const existsInLibrary = songs.some((song) => song.id === currentSong.id)
    if (!existsInLibrary) {
      setCurrentSong(null)
    }
  }, [songs, currentSong, setCurrentSong])

  async function handleDelete(id: number) {
    try {
      await deleteSong(id)
      setSongs((prev) => prev.filter((s) => s.id !== id))
      if (currentSong?.id === id) {
        setCurrentSong(null)
      }
      toaster.success({ title: "Song deleted" })
    } catch {
      toaster.error({ title: "Failed to delete song" })
    }
  }

  return (
    <>
      <VStack align="stretch" gap="8">
        <Box>
          <Heading size="2xl" fontWeight="bold" color="fg">
            Library
          </Heading>
          <Text color="fg.muted" mt="1">
            Your saved songs
          </Text>
        </Box>

        {loading ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                bg="bg.subtle"
                rounded="xl"
                p="5"
                borderWidth="1px"
                borderColor="border.muted"
                h="180px"
              />
            ))}
          </Grid>
        ) : songs.length === 0 ? (
          <Box
            bg="bg.subtle"
            rounded="xl"
            p="12"
            borderWidth="1px"
            borderColor="border.muted"
            textAlign="center"
          >
            <VStack gap="4">
              <Box p="4" rounded="full" bg="teal.500/10">
                <Box as={LuLibrary} boxSize="8" color="teal.400" />
              </Box>
              <Text color="fg.muted" fontWeight="medium">
                No songs saved yet. Generate a song and save it here!
              </Text>
            </VStack>
          </Box>
        ) : (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
            {songs.map((song) => {
              const isActive = currentSong?.id === song.id
              return (
                <Box
                  key={song.id}
                  bg={isActive ? "teal.500/5" : "bg.subtle"}
                  rounded="xl"
                  p="5"
                  borderWidth="1px"
                  borderColor={isActive ? "teal.500/30" : "border.muted"}
                  transition="all"
                  transitionDuration="fast"
                  _hover={{ shadow: "md", borderColor: "teal.500/20" }}
                  cursor={song.audio_url ? "pointer" : "default"}
                  onClick={() => {
                    if (song.audio_url) {
                      setCurrentSong(song)
                    }
                  }}
                >
                  <Stack gap="3">
                    <HStack justify="space-between">
                      <HStack gap="3">
                        <Box
                          p="2"
                          rounded="lg"
                          bg={isActive ? "teal.500/20" : "teal.500/10"}
                          position="relative"
                        >
                          {isActive ? (
                            <Box as={LuPlay} boxSize="4" color="teal.300" />
                          ) : (
                            <Box as={LuMusic} boxSize="4" color="teal.400" />
                          )}
                        </Box>
                        <Box>
                          <Text fontWeight="bold" color={isActive ? "teal.300" : "fg"} lineClamp={1}>
                            {song.title}
                          </Text>
                          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                            {song.genre}
                          </Text>
                        </Box>
                      </HStack>
                      <Button
                        variant="ghost"
                        size="xs"
                        colorPalette="red"
                        onClick={(e) => { e.stopPropagation(); handleDelete(song.id) }}
                      >
                        <LuTrash2 />
                      </Button>
                    </HStack>

                    <HStack justify="space-between" align="center">
                      <Text fontSize="xs" color="fg.subtle">
                        {new Date(song.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      {song.audio_url ? (
                        <HStack gap="1">
                          <Button
                            variant="ghost"
                            size="xs"
                            colorPalette="teal"
                            onClick={(e) => { e.stopPropagation(); downloadFile(song.audio_url as string) }}
                          >
                            <LuDownload />
                            MP3
                          </Button>
                          {song.audio_hi_url && (
                            <Button
                              variant="ghost"
                              size="xs"
                              colorPalette="teal"
                              onClick={(e) => { e.stopPropagation(); downloadFile(song.audio_hi_url as string) }}
                            >
                              <LuDownload />
                              WAV
                            </Button>
                          )}
                        </HStack>
                      ) : (
                        <Text fontSize="xs" color="fg.subtle">No audio</Text>
                      )}
                    </HStack>
                  </Stack>
                </Box>
              )
            })}
          </Grid>
        )}
      </VStack>
    </>
  )
}
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Progress,
  Skeleton,
  Slider,
  Stack,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { LuCoins, LuDownload, LuLibrary, LuMusic, LuPause, LuPlay, LuSparkles, LuVolume2, LuVolumeX, LuWandSparkles } from "react-icons/lu"
import { Switch } from "@/components/ui/switch"
import { toaster } from "@/components/ui/toaster"
import {
  generateLyrics,
  generateSong,
  generateSunoSong,
  querySongStatus,
  querySunoStatus,
  getSetting,
  saveSong,
  getBalance,
  getSunoBalance,
  type SunoStatusSunoItem,
} from "@/lib/api"
import { downloadFile } from "@/lib/download"
import { usePersistentState } from "@/lib/use-persistent-state"

type ModelOption = {
  label: string
  value: string
}

const tempolorModels: ModelOption[] = [
  { label: "TemPolor v3", value: "TemPolor v3" },
  { label: "TemPolor v3.5", value: "TemPolor v3.5" },
  { label: "TemPolor v4.5", value: "TemPolor v4.5" },
]

const sunoModels: ModelOption[] = [
  { label: "V5.5", value: "V5_5" },
  { label: "V5", value: "V5" },
  { label: "V4.5+", value: "V4_5PLUS" },
  { label: "V4.5", value: "V4_5" },
  { label: "V4", value: "V4" },
  { label: "V4.5ALL", value: "V4_5ALL" },
]

const sunoLegacyModelMap: Record<string, string> = {
  "V5.5": "V5_5",
  "V4.5+": "V4_5PLUS",
  "V4.5": "V4_5",
  "V4.5ALL": "V4_5ALL",
  "Suno V4_5ALL": "V4_5ALL",
}
const languages = ["English", "Dutch", "German", "Spanish", "French", "Korean", "Japanese", "Chinese"]

type Provider = "tempolor" | "suno"

const voices = [
  { id: "", name: "Auto (Default)", description: "Let the AI choose the best voice" },
  { id: "SV000001", name: "Jaden", description: "Clear and powerful, fast rap, strong emotions" },
  { id: "SV000002", name: "Maya", description: "Soft and warm, comfortable feeling, great control" },
  { id: "SV000003", name: "Micah", description: "Smooth and rounded, vintage soul music" },
  { id: "SV000004", name: "Aaliyah", description: "Exceptionally strong, piercing power, wide range" },
  { id: "SV000005", name: "Theo", description: "Transparent, high notes, direct emotional expression" },
  { id: "SV000006", name: "Clara", description: "Somewhat deep, a bit of roughness, sincere" },
  { id: "SV000007", name: "Sofia", description: "Bright and flexible, rhythmic pauses" },
  { id: "SV000008", name: "Elias", description: "Slightly raspy, sense of vulnerability, emotional" },
  { id: "SV000009", name: "Raven", description: "Husky, relaxed and casual, direct emotions" },
  { id: "SV000010", name: "Sienna", description: "Highly varied, sweet singing and fast rapping" },
  { id: "SV000011", name: "Nova", description: "Clean and crisp, breezy, great for pop" },
  { id: "SV000012", name: "Hazel", description: "Gentle, hint of laziness, perfect for quiet listening" },
  { id: "SV000013", name: "Ruby", description: "Refreshing, full of energy, youthful vibe" },
  { id: "SV000015", name: "Henry", description: "Deep, slow, storytelling, calm and profound" },
  { id: "SV000016", name: "Elliot", description: "Gentle yet high notes, clean register, ethereal" },
  { id: "SV000017", name: "Owen", description: "Warm and comfortable, natural and conversational" },
  { id: "SV000019", name: "Leo", description: "Slightly rough, delicate emotions, infectious" },
  { id: "SV000020", name: "Caleb", description: "Clear, fast-paced, smooth rapping, great rhythm" },
  { id: "SV000021", name: "Ella", description: "Gentle, like whispering, very quiet" },
  { id: "SV000022", name: "Lennox", description: "Light and lively, bright feel, catchy melody" },
  { id: "SV000023", name: "Nia", description: "Solid and powerful, steady low and high notes" },
  { id: "SV000025", name: "Asa", description: "Light, fluffy, gentle, melancholic" },
  { id: "SV000031", name: "Dax", description: "Velvety smooth baritone, magnetic and mellow" },
  { id: "SV000032", name: "Blaze", description: "Full of depth and power, bright and genuine" },
]

type GenerationStatus = "idle" | "sending" | "generating" | "done" | "failed"

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function GeneratorPage() {
  const [title, setTitle] = usePersistentState("veles.generator.title", "")
  const [genre, setGenre] = usePersistentState("veles.generator.genre", "")
  const [provider, setProvider] = usePersistentState<Provider>("veles.generator.provider", "tempolor")
  const [model, setModel] = usePersistentState("veles.generator.model", "TemPolor v3.5")
  const [language, setLanguage] = usePersistentState("veles.generator.language", "English")
  const [voiceId, setVoiceId] = usePersistentState("veles.generator.voiceId", "")
  const [autoGenerate, setAutoGenerate] = usePersistentState("veles.generator.autoGenerate", false)
  const [lyrics, setLyrics] = usePersistentState("veles.generator.lyrics", "")
  const [lyricsPrompt, setLyricsPrompt] = usePersistentState("veles.generator.lyricsPrompt", "")
  const [generatingLyrics, setGeneratingLyrics] = useState(false)
  const [status, setStatus] = useState<GenerationStatus>("idle")
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null)
  const [resultAudioHiUrl, setResultAudioHiUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [tempolorBalance, setTempolorBalance] = useState<number | null>(null)
  const [sunoBalance, setSunoBalance] = useState<number | null>(null)
  const [pollAttempt, setPollAttempt] = useState(0)
  const inlineAudioRef = useRef<HTMLAudioElement | null>(null)
  const [inlinePlaying, setInlinePlaying] = useState(false)
  const [inlineCurrentTime, setInlineCurrentTime] = useState(0)
  const [inlineDuration, setInlineDuration] = useState(0)
  const [inlineVolume, setInlineVolume] = useState(80)
  const [inlineMuted, setInlineMuted] = useState(false)

  const inlineAudioSrc = resultAudioHiUrl ?? resultAudioUrl
  const availableModels = provider === "suno" ? sunoModels : tempolorModels

  const formatTempolorCredits = useCallback((value: number): string => {
    const normalized = value < 100 ? Math.round(value * 100) : Math.round(value)
    return normalized.toString()
  }, [])

  const refreshProviderCredits = useCallback(() => {
    getBalance().then(setTempolorBalance).catch(() => {})
    getSunoBalance().then(setSunoBalance).catch(() => {})
  }, [])

  useEffect(() => {
    async function loadDefaults() {
      const m = await getSetting("default_model")
      if (m) setModel(m)
      const l = await getSetting("default_language")
      if (l) setLanguage(l)
      refreshProviderCredits()
    }
    loadDefaults()
  }, [refreshProviderCredits, setLanguage, setModel])

  useEffect(() => {
    if (provider === "suno") {
      const normalized = sunoLegacyModelMap[model]
      if (normalized) {
        setModel(normalized)
        return
      }

      const hasModel = sunoModels.some((m) => m.value === model)
      if (!hasModel) {
        setModel(sunoModels[0].value)
      }
      return
    }

    const hasModel = tempolorModels.some((m) => m.value === model)
    if (!hasModel) {
      setModel(tempolorModels[0].value)
    }
  }, [model, provider, setModel])

  useEffect(() => {
    if (!inlineAudioRef.current) return
    inlineAudioRef.current.volume = inlineMuted ? 0 : inlineVolume / 100
  }, [inlineVolume, inlineMuted])

  useEffect(() => {
    if (!inlineAudioRef.current || !inlineAudioSrc) return
    inlineAudioRef.current.src = inlineAudioSrc
    inlineAudioRef.current.load()
    inlineAudioRef.current.play().then(() => setInlinePlaying(true)).catch(() => setInlinePlaying(false))
    setInlineCurrentTime(0)
  }, [inlineAudioSrc])

  const handleInlineSeek = useCallback((details: { value: number[] }) => {
    if (!inlineAudioRef.current) return
    inlineAudioRef.current.currentTime = details.value[0]
    setInlineCurrentTime(details.value[0])
  }, [])

  function toggleInlinePlay() {
    if (!inlineAudioRef.current || !inlineAudioSrc) return
    if (inlinePlaying) {
      inlineAudioRef.current.pause()
      setInlinePlaying(false)
    } else {
      inlineAudioRef.current.play().then(() => setInlinePlaying(true)).catch(() => {})
    }
  }

  const pollForResult = useCallback(async (itemIds: string[], maxAttempts = 60): Promise<{ audio_url: string | null; audio_hi_url: string | null }> => {
    const MAX_CONSECUTIVE_FAILURES = 5
    let consecutiveFailures = 0
    for (let i = 0; i < maxAttempts; i++) {
      setPollAttempt(i + 1)
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const result = await querySongStatus(itemIds)
        consecutiveFailures = 0
        if (result.status === "succeeded" || result.status === "completed" || result.status === "complete" || result.audio_url) {
          return { audio_url: result.audio_url ?? null, audio_hi_url: result.audio_hi_url ?? null }
        }
        if (result.status === "failed" || result.status === "error") {
          return { audio_url: null, audio_hi_url: null }
        }
      } catch (err) {
        consecutiveFailures++
        if (process.env.NODE_ENV === "development") {
          console.error(`[pollForResult] fetch error (attempt ${i + 1}, consecutive: ${consecutiveFailures}):`, err)
        }
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          if (process.env.NODE_ENV === "development") {
            console.error("[pollForResult] stopping early after", MAX_CONSECUTIVE_FAILURES, "consecutive failures")
          }
          return { audio_url: null, audio_hi_url: null }
        }
      }
    }
    return { audio_url: null, audio_hi_url: null }
  }, [])

  const pollForSunoResult = useCallback(async (taskId: string, maxAttempts = 60): Promise<{
    status: string
    audioUrl?: string
    sunoData?: SunoStatusSunoItem[]
  }> => {
    for (let i = 0; i < maxAttempts; i++) {
      setPollAttempt(i + 1)
      await new Promise((r) => setTimeout(r, 3000))
      const result = await querySunoStatus(taskId)
      if (result.status === "completed") {
        return result
      }
      if (result.status === "failed") {
        return result
      }
    }
    return { status: "failed" }
  }, [])

  async function handleGenerateLyrics() {
    if (!lyricsPrompt.trim()) return

    if (provider === "suno") {
      toaster.error({
        title: "Not available for Suno",
        description: "Use Tempolor provider for auto lyric generation.",
      })
      return
    }

    setGeneratingLyrics(true)
    try {
      const generated = await generateLyrics(lyricsPrompt, model)
      setLyrics(generated)
      toaster.success({ title: "Lyrics generated!" })
    } catch (error: unknown) {
      toaster.error({ title: "Error generating lyrics", description: getErrorMessage(error) })
    } finally {
      setGeneratingLyrics(false)
    }
  }

  async function handleGenerateSong() {
    if (!genre.trim() || !lyrics.trim()) return
    setStatus("sending")
    setGenerationError(null)
    setResultAudioUrl(null)
    setResultAudioHiUrl(null)
    setSaved(false)
    setPollAttempt(0)
    try {
      const isSunoModel = provider === "suno"

      if (isSunoModel) {
        const taskId = await generateSunoSong({
          title: title || "Untitled",
          style: genre,
          prompt: lyrics,
          model,
          instrumental: false,
        })

        setStatus("generating")
        const sunoResult = await pollForSunoResult(taskId)
        if (sunoResult.status === "completed" && Array.isArray(sunoResult.sunoData) && sunoResult.sunoData.length > 0) {
          const song1 = sunoResult.sunoData[0]
          const song2 = sunoResult.sunoData[1]

          await saveSong({
            title: `${title || "Untitled"} (1)`,
            genre,
            lyrics: song1?.prompt ?? lyrics,
            model,
            language,
            status: "completed",
            item_ids: null,
            audio_url: song1?.audioUrl ?? null,
            audio_hi_url: null,
          })

          await saveSong({
            title: `${title || "Untitled"} (2)`,
            genre,
            lyrics: song2?.prompt ?? song1?.prompt ?? lyrics,
            model,
            language,
            status: "completed",
            item_ids: null,
            audio_url: song2?.audioUrl ?? null,
            audio_hi_url: null,
          })

          setResultAudioUrl(song1?.audioUrl ?? null)
          setResultAudioHiUrl(null)
          setSaved(true)
          setStatus("done")
          setPollAttempt(0)
          toaster.success({ title: "2 songs saved to library" })
        } else {
          setStatus("failed")
          setPollAttempt(0)
          const timeoutMessage = "Song generation timed out before audio was returned."
          setGenerationError(timeoutMessage)
          toaster.error({ title: "Generation failed", description: timeoutMessage })
        }
        return
      }

      const prompt = `${genre}${language !== "English" ? `, language: ${language}` : ""}`
      const itemIds = await generateSong(prompt, lyrics, model, voiceId || undefined)
      setStatus("generating")
      const { audio_url, audio_hi_url } = await pollForResult(itemIds)
      if (audio_url) {
        setResultAudioUrl(audio_url)
        setResultAudioHiUrl(audio_hi_url)
        setStatus("done")
        setPollAttempt(0)
        toaster.success({ title: "Song generated!" })
      } else {
        setStatus("failed")
        setPollAttempt(0)
        const timeoutMessage = "Song generation timed out before audio was returned."
        setGenerationError(timeoutMessage)
        toaster.error({ title: "Generation failed", description: timeoutMessage })
      }
      refreshProviderCredits()
    } catch (error: unknown) {
      setStatus("failed")
      setPollAttempt(0)
      const message = getErrorMessage(error)
      setGenerationError(message)
      toaster.error({ title: "Error", description: message })
    }
  }

  async function handleSaveToLibrary() {
    try {
      await saveSong({
        title: title || "Untitled",
        genre,
        lyrics,
        model,
        language,
        status: "completed",
        item_ids: null,
        audio_url: resultAudioUrl,
        audio_hi_url: resultAudioHiUrl,
      })
      setSaved(true)
      setStatus("done")
      toaster.success({ title: "Saved to library" })
    } catch (error: unknown) {
      toaster.error({ title: "Error saving", description: getErrorMessage(error) })
    }
  }

  const canGenerate = genre.trim().length > 0 && lyrics.trim().length > 0 && status !== "sending" && status !== "generating"

  return (
    <VStack align="stretch" gap="8">
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap="4">
        <Box>
          <Heading size="2xl" fontWeight="bold" color="fg">
            Song Generator
          </Heading>
          <Text color="fg.muted" mt="1">
            Create AI-generated songs with custom lyrics
          </Text>
        </Box>
        <HStack gap="3" wrap="wrap" justify="flex-end">
          {tempolorBalance !== null && (
            <HStack
              bg="bg.subtle"
              px="4"
              py="2"
              rounded="lg"
              borderWidth="1px"
              borderColor="border.muted"
              gap="2"
            >
              <Box as={LuCoins} boxSize="4" color="teal.400" />
              <Text fontSize="sm" color="fg.muted">Tempolor</Text>
              <Text fontWeight="semibold" color="fg">
                {formatTempolorCredits(tempolorBalance)}
              </Text>
              <Text fontSize="sm" color="fg.muted">credits</Text>
            </HStack>
          )}
          {sunoBalance !== null && (
            <HStack
              bg="bg.subtle"
              px="4"
              py="2"
              rounded="lg"
              borderWidth="1px"
              borderColor="border.muted"
              gap="2"
            >
              <Box as={LuCoins} boxSize="4" color="teal.400" />
              <Text fontSize="sm" color="fg.muted">Suno</Text>
              <Text fontWeight="semibold" color="fg">
                {Math.round(sunoBalance)}
              </Text>
              <Text fontSize="sm" color="fg.muted">credits</Text>
            </HStack>
          )}
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="6">
        <Box
          bg="bg.subtle"
          rounded="xl"
          p="6"
          borderWidth="1px"
          borderColor="border.muted"
        >
          <Stack gap="5">
            <Heading size="md" color="fg">Song Settings</Heading>

            <Box>
              <Text fontWeight="medium" mb="2" fontSize="sm" color="fg">
                Song Title
              </Text>
              <Input
                placeholder="My amazing song"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                bg="bg"
              />
            </Box>

            <Box>
              <Text fontWeight="medium" mb="2" fontSize="sm" color="fg">
                Genre / Style
              </Text>
              <Textarea
                placeholder="Dream Pop, shimmering synths, female vocals"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                bg="bg"
                rows={5}
                resize="vertical"
              />
            </Box>

            <Box>
              <Text fontWeight="medium" mb="2" fontSize="sm" color="fg">
                Provider
              </Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Provider"
                  title="Provider"
                  value={provider}
                  onChange={(e) => setProvider(e.currentTarget.value as Provider)}
                  bg="bg"
                >
                  <option value="tempolor">Tempolor</option>
                  <option value="suno">Suno</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>

            <Box>
              <Text fontWeight="medium" mb="2" fontSize="sm" color="fg">
                Model
              </Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Model"
                    title="Model"
                  value={model}
                  onChange={(e) => setModel(e.currentTarget.value)}
                  bg="bg"
                >
                  {availableModels.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>

            <Box>
              <Text fontWeight="medium" mb="2" fontSize="sm" color="fg">
                Language
              </Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Language"
                    title="Language"
                  value={language}
                  onChange={(e) => setLanguage(e.currentTarget.value)}
                  bg="bg"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>

            {provider === "tempolor" && (
              <Box>
                <Text fontWeight="medium" mb="2" fontSize="sm" color="fg">
                  Voice
                </Text>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    aria-label="Voice"
                      title="Voice"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.currentTarget.value)}
                    bg="bg"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.description}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {voiceId && (
                  <Text fontSize="xs" color="fg.subtle" mt="1">
                    {voices.find((v) => v.id === voiceId)?.description}
                  </Text>
                )}
              </Box>
            )}
          </Stack>
        </Box>

        <Box
          bg="bg.subtle"
          rounded="xl"
          p="6"
          borderWidth="1px"
          borderColor="border.muted"
        >
          <Stack gap="5">
            <Flex justify="space-between" align="center">
              <Heading size="md" color="fg">Lyrics</Heading>
              <HStack gap="2">
                <Text fontSize="sm" color="fg.muted">Auto-generate</Text>
                <Switch
                  colorPalette="teal"
                  checked={autoGenerate}
                  onCheckedChange={(e) => setAutoGenerate(e.checked)}
                />
              </HStack>
            </Flex>

            {autoGenerate && (
              <Box>
                <Textarea
                  placeholder="Describe the song you want lyrics for... e.g. 'A melancholic ballad about lost love in autumn'"
                  value={lyricsPrompt}
                  onChange={(e) => setLyricsPrompt(e.target.value)}
                  bg="bg"
                  rows={3}
                  resize="vertical"
                />
                <Button
                  mt="3"
                  colorPalette="teal"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLyrics}
                  loading={generatingLyrics}
                  disabled={!lyricsPrompt.trim() || generatingLyrics}
                >
                  <LuSparkles />
                  Generate Lyrics
                </Button>
              </Box>
            )}

            <Box position="relative">
              {generatingLyrics ? (
                <Stack gap="3">
                  <Skeleton height="4" />
                  <Skeleton height="4" width="90%" />
                  <Skeleton height="4" width="80%" />
                  <Skeleton height="4" width="85%" />
                  <Skeleton height="4" width="70%" />
                </Stack>
              ) : (
                <Textarea
                  placeholder={`[Verse 1]\nYour lyrics here...\n\n[Chorus]\nThe catchy part...\n\n[Bridge]\nSomething different...`}
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value.slice(0, 3000))}
                  bg="bg"
                  rows={12}
                  resize="vertical"
                  fontFamily="mono"
                  fontSize="sm"
                />
              )}
              <Text fontSize="xs" color="fg.subtle" mt="1" textAlign="right">
                {lyrics.length} / 3000
              </Text>
            </Box>
          </Stack>
        </Box>
      </Grid>

      <Button
        colorPalette="teal"
        size="xl"
        w="full"
        py="7"
        fontSize="lg"
        fontWeight="bold"
        onClick={handleGenerateSong}
        disabled={!canGenerate}
        loading={status === "sending" || status === "generating"}
        loadingText={status === "sending" ? "Sending to Veles..." : "Generating your song..."}
      >
        <LuWandSparkles />
        Generate Song
      </Button>

      {status === "generating" && (
        <Box
          bg="bg.subtle"
          rounded="xl"
          p="6"
          borderWidth="1px"
          borderColor="border.muted"
        >
          <Stack gap="4">
            <Flex align="center" gap="3" justify="center">
              <Box
                animation="pulse 2s ease-in-out infinite"
                p="3"
                rounded="full"
                bg="teal.500/10"
              >
                <Box as={LuMusic} boxSize="6" color="teal.400" />
              </Box>
              <Box>
                <Text color="fg.muted" fontWeight="medium">
                  Generating your song... This may take a few minutes.
                </Text>
                <Text fontSize="sm" color="fg.subtle">
                  Attempt {pollAttempt} of 60
                </Text>
              </Box>
            </Flex>
            <Progress.Root
              value={(pollAttempt / 60) * 100}
              striped
              animated
              colorPalette="teal"
              size="sm"
            >
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Stack>
        </Box>
      )}

      {status === "done" && resultAudioUrl && (
        <Box
          bg="bg.subtle"
          rounded="xl"
          p="6"
          borderWidth="1px"
          borderColor="teal.500/30"
        >
          <Stack gap="4">
            <HStack gap="3">
              <Box
                p="2"
                rounded="lg"
                bg="teal.500/10"
              >
                <Box as={LuMusic} boxSize="5" color="teal.400" />
              </Box>
              <Box>
                <Text fontWeight="bold" color="fg">{title || "Untitled"}</Text>
                <Text fontSize="sm" color="fg.muted">{genre}</Text>
              </Box>
            </HStack>

            <Box
              bg="bg.panel"
              borderWidth="1px"
              borderColor="border.muted"
              rounded="lg"
              px="4"
              py="3"
            >
              <audio
                ref={inlineAudioRef}
                onTimeUpdate={() => setInlineCurrentTime(inlineAudioRef.current?.currentTime ?? 0)}
                onLoadedMetadata={() => setInlineDuration(inlineAudioRef.current?.duration ?? 0)}
                onEnded={() => setInlinePlaying(false)}
              />
              <HStack gap="3" align="center">
                <IconButton
                  aria-label={inlinePlaying ? "Pause" : "Play"}
                  variant="solid"
                  colorPalette="teal"
                  size="sm"
                  rounded="full"
                  onClick={toggleInlinePlay}
                >
                  {inlinePlaying ? <LuPause /> : <LuPlay />}
                </IconButton>
                <Text fontSize="xs" color="fg.subtle" w="10" textAlign="right">
                  {formatTime(inlineCurrentTime)}
                </Text>
                <Slider.Root
                  flex="1"
                  size="sm"
                  colorPalette="teal"
                  value={[inlineCurrentTime]}
                  min={0}
                  max={inlineDuration || 100}
                  step={0.5}
                  onValueChange={handleInlineSeek}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumbs />
                  </Slider.Control>
                </Slider.Root>
                <Text fontSize="xs" color="fg.subtle" w="10">
                  {formatTime(inlineDuration)}
                </Text>
                <HStack gap="2" display={{ base: "none", md: "flex" }} w="120px">
                  <IconButton
                    aria-label={inlineMuted ? "Unmute" : "Mute"}
                    variant="ghost"
                    size="xs"
                    onClick={() => setInlineMuted((prev) => !prev)}
                  >
                    {inlineMuted || inlineVolume === 0 ? <LuVolumeX /> : <LuVolume2 />}
                  </IconButton>
                  <Slider.Root
                    flex="1"
                    size="sm"
                    colorPalette="teal"
                    value={[inlineMuted ? 0 : inlineVolume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(details) => {
                      setInlineVolume(details.value[0])
                      setInlineMuted(false)
                    }}
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </HStack>
              </HStack>
            </Box>

            <HStack gap="3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void downloadFile(resultAudioUrl, `${title || "song"}.mp3`)}
              >
                <LuDownload />
                Download
              </Button>
              {!saved && (
                <Button
                  colorPalette="teal"
                  size="sm"
                  onClick={handleSaveToLibrary}
                >
                  <LuLibrary />
                  Save to Library
                </Button>
              )}
            </HStack>
          </Stack>
        </Box>
      )}

      {status === "failed" && (
        <Box
          bg="bg.subtle"
          rounded="xl"
          p="6"
          borderWidth="1px"
          borderColor="border.error"
        >
          <Text color="fg.error" fontWeight="medium">
            {generationError ?? "Song generation failed. Please review your settings and try again."}
          </Text>
        </Box>
      )}
    </VStack>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Input, NativeSelect, Stack, Text, VStack } from "@chakra-ui/react"
import { LuFlaskConical, LuSettings } from "react-icons/lu"
import {
  getApiKey,
  saveApiKey,
  getSetting,
  saveSetting,
  testApiKey,
  getSunoApiKey,
  saveSunoApiKey,
  getSunoBalance,
  getLyriaApiKey,
  saveLyriaApiKey,
} from "@/lib/api"
import { PasswordInput } from "@/components/ui/password-input"
import { Switch } from "@/components/ui/switch"
import { toaster } from "@/components/ui/toaster"

const models = ["TemPolor v3", "TemPolor v3.5", "TemPolor v4.5"]
const languages = ["English", "Dutch", "German", "Spanish", "French", "Korean", "Japanese", "Chinese"]
const nativeMenuSettingKey = "native_windows_menu_enabled"
const apiRequestLoggingSettingKey = "api_request_logging_enabled"

type NativeMenuBridge = {
  isSupported: () => boolean
  getState: () => Promise<{ enabled: boolean; supported: boolean }>
  setEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>
}

type WindowWithNativeMenu = Window & {
  electronNativeMenu?: NativeMenuBridge
}

function getNativeMenuBridge(): NativeMenuBridge | null {
  if (typeof window === "undefined") return null
  const browserWindow = window as WindowWithNativeMenu
  return browserWindow.electronNativeMenu ?? null
}

function parseBooleanSetting(value: string | null): boolean {
  return value === "true"
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not reach the API."
}

type TestApiKeyFn = (provider?: "tempolor" | "poyo") => Promise<void>
const testApiKeyByProvider = testApiKey as TestApiKeyFn

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [poyoApiKey, setPoyoApiKey] = useState("")
  const [sunoApiKey, setSunoApiKey] = useState("")
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [activeProvider, setActiveProvider] = useState<"tempolor" | "poyo">("tempolor")
  const [defaultModel, setDefaultModel] = useState("TemPolor v3.5")
  const [defaultLanguage, setDefaultLanguage] = useState("English")
  const [nativeMenuEnabled, setNativeMenuEnabled] = useState(false)
  const [nativeMenuSupported, setNativeMenuSupported] = useState(false)
  const [apiRequestLoggingEnabled, setApiRequestLoggingEnabled] = useState(false)
  const [callbackBaseUrl, setCallbackBaseUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [sunoSaving, setSunoSaving] = useState(false)
  const [sunoTesting, setSunoTesting] = useState(false)
  const [geminiSaving, setGeminiSaving] = useState(false)
  const [geminiTesting, setGeminiTesting] = useState(false)

  useEffect(() => {
    async function load() {
      const key = await getApiKey()
      if (key) setApiKey(key)
      const poyoKey = await getSetting("poyo_api_key")
      if (poyoKey) setPoyoApiKey(poyoKey)
      const sunoKey = await getSunoApiKey()
      if (sunoKey) setSunoApiKey(sunoKey)
      const geminiKey = await getLyriaApiKey()
      if (geminiKey) setGeminiApiKey(geminiKey)
      const provider = await getSetting("active_provider")
      if (provider === "tempolor" || provider === "poyo") {
        setActiveProvider(provider)
      }
      const model = await getSetting("default_model")
      if (model) setDefaultModel(model)
      const lang = await getSetting("default_language")
      if (lang) setDefaultLanguage(lang)

      const menuBridge = getNativeMenuBridge()
      let supportsNativeMenu = false
      if (menuBridge) {
        try {
          supportsNativeMenu = (await menuBridge.getState()).supported
        } catch {
          supportsNativeMenu = menuBridge.isSupported()
        }
      }
      setNativeMenuSupported(supportsNativeMenu)

      const nativeMenuValue = parseBooleanSetting(await getSetting(nativeMenuSettingKey))
      setNativeMenuEnabled(nativeMenuValue)

      const apiRequestLoggingValue = parseBooleanSetting(await getSetting(apiRequestLoggingSettingKey))
      setApiRequestLoggingEnabled(apiRequestLoggingValue)

      const callbackUrl = await getSetting("callback_base_url")
      if (callbackUrl) setCallbackBaseUrl(callbackUrl)

      if (supportsNativeMenu && menuBridge) {
        try {
          await menuBridge.setEnabled(nativeMenuValue)
        } catch (error: unknown) {
          toaster.error({ title: "Desktop integration error", description: getErrorMessage(error) })
        }
      }
    }
    void load()
  }, [])

  async function handleTestApi() {
    setTesting(true)
    try {
      const [tempolorResult, poyoResult] = await Promise.allSettled([
        testApiKeyByProvider("tempolor"),
        testApiKeyByProvider("poyo"),
      ])

      const tempolorOk = tempolorResult.status === "fulfilled"
      const poyoOk = poyoResult.status === "fulfilled"

      if (tempolorOk && poyoOk) {
        toaster.success({
          title: "Connection successful",
          description: "Tempolor and PoYo API keys are valid.",
        })
        return
      }

      if (tempolorResult.status === "rejected") {
        toaster.error({
          title: "Tempolor connection failed",
          description: getErrorMessage(tempolorResult.reason),
        })
      }

      if (poyoResult.status === "rejected") {
        toaster.error({
          title: "PoYo connection failed",
          description: getErrorMessage(poyoResult.reason),
        })
      }
    } catch {
      toaster.error({ title: "Connection failed", description: "Could not run provider tests." })
    } finally {
      setTesting(false)
    }
  }

  async function handleSaveSunoApi() {
    setSunoSaving(true)
    try {
      await saveSunoApiKey(sunoApiKey.trim())
      toaster.success({ title: "Suno API key saved", description: "Your Suno key has been updated." })
    } catch (error: unknown) {
      toaster.error({ title: "Error", description: getErrorMessage(error) })
    } finally {
      setSunoSaving(false)
    }
  }

  async function handleTestSunoApi() {
    setSunoTesting(true)
    try {
      const key = sunoApiKey.trim()
      if (!key) {
        throw new Error("Please enter a Suno API key first.")
      }
      await saveSunoApiKey(key)
      const remainingCredits = await getSunoBalance()
      toaster.success({
        title: "Suno connection successful",
        description: `Remaining credits: ${remainingCredits}`,
      })
    } catch (error: unknown) {
      toaster.error({ title: "Suno connection failed", description: getErrorMessage(error) })
    } finally {
      setSunoTesting(false)
    }
  }

  async function handleSaveGeminiApi() {
    setGeminiSaving(true)
    try {
      await saveLyriaApiKey(geminiApiKey.trim())
      toaster.success({ title: "Gemini API key saved", description: "Your Gemini key has been updated." })
    } catch (error: unknown) {
      toaster.error({ title: "Error", description: getErrorMessage(error) })
    } finally {
      setGeminiSaving(false)
    }
  }

  async function handleTestGeminiApi() {
    setGeminiTesting(true)
    try {
      const key = geminiApiKey.trim()
      if (!key) {
        throw new Error("Please enter a Gemini API key first.")
      }

      await saveLyriaApiKey(key)

      const res = await fetch("/api/lyria-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "test", model: "clip" }),
      })

      if (!res.ok) {
        let message = `API error: ${res.status}`
        try {
          const payload = await res.json() as { error?: string }
          if (payload.error) {
            message = payload.error
          }
        } catch {
          // Keep status-based fallback when response body is not JSON.
        }
        throw new Error(message)
      }

      const contentType = res.headers.get("content-type") || ""
      if (!contentType.startsWith("audio/")) {
        throw new Error("Lyria proxy did not return audio data.")
      }

      toaster.success({ title: "Lyria connection successful", description: "Audio response received." })
    } catch (error: unknown) {
      toaster.error({ title: "Lyria connection failed", description: getErrorMessage(error) })
    } finally {
      setGeminiTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveApiKey(apiKey)
      await saveSetting("poyo_api_key", poyoApiKey)
      await saveSetting("active_provider", activeProvider)
      await saveSetting("default_model", defaultModel)
      await saveSetting("default_language", defaultLanguage)
      await saveSetting(nativeMenuSettingKey, nativeMenuEnabled ? "true" : "false")
      await saveSetting(apiRequestLoggingSettingKey, apiRequestLoggingEnabled ? "true" : "false")
      await saveSetting("callback_base_url", callbackBaseUrl.trim())

      const menuBridge = getNativeMenuBridge()
      if (nativeMenuSupported && menuBridge) {
        await menuBridge.setEnabled(nativeMenuEnabled)
      }

      toaster.success({ title: "Settings saved", description: "Your preferences have been updated." })
    } catch (error: unknown) {
      toaster.error({ title: "Error", description: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack align="stretch" gap="8">
      <Box>
        <Heading size="2xl" fontWeight="bold" color="fg">
          Settings
        </Heading>
        <Text color="fg.muted" mt="1">
          Configure your Veles preferences
        </Text>
      </Box>

      <Box
        bg="bg.subtle"
        rounded="xl"
        p="6"
        borderWidth="1px"
        borderColor="border.muted"
      >
        <Stack gap="6">
          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Tempolor API Key
            </Text>
            <PasswordInput
              placeholder="Enter your Tempolor API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              bg="bg"
              size="lg"
            />
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Get your key from the Tempolor dashboard
            </Text>
            <HStack gap="3" mt="3">
              <Button
                colorPalette="teal"
                size="lg"
                onClick={handleSave}
                loading={saving}
              >
                <LuSettings />
                Save Settings
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleTestApi}
                loading={testing}
              >
                <LuFlaskConical />
                Test API Key
              </Button>
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              PoYo API Key
            </Text>
            <PasswordInput
              placeholder="Enter your PoYo API key"
              value={poyoApiKey}
              onChange={(e) => setPoyoApiKey(e.target.value)}
              bg="bg"
              size="lg"
            />
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Get your key from poyo.ai/dashboard/api-key
            </Text>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Active Music Provider
            </Text>
            <NativeSelect.Root size="lg">
              <NativeSelect.Field
                aria-label="Active music provider"
                title="Active music provider"
                name="active_provider"
                value={activeProvider}
                onChange={(e) => {
                  const value = e.currentTarget.value
                  if (value === "tempolor" || value === "poyo") {
                    setActiveProvider(value)
                  }
                }}
                bg="bg"
              >
                <option value="tempolor">Tempolor</option>
                <option value="poyo">PoYo</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Suno API Key
            </Text>
            <PasswordInput
              placeholder="Enter your Suno API key"
              value={sunoApiKey}
              onChange={(e) => setSunoApiKey(e.target.value)}
              bg="bg"
              size="lg"
            />
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Get your API key at sunoapi.org/api-key
            </Text>
            <HStack gap="3" mt="3">
              <Button
                colorPalette="teal"
                size="sm"
                onClick={handleSaveSunoApi}
                loading={sunoSaving}
              >
                <LuSettings />
                Save Suno Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSunoApi}
                loading={sunoTesting}
              >
                <LuFlaskConical />
                Test Suno Key
              </Button>
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Google Gemini API Key (for Lyria 3)
            </Text>
            <PasswordInput
              placeholder="Enter your Gemini API key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              bg="bg"
              size="lg"
            />
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Get your free API key at aistudio.google.com/apikey
            </Text>
            <HStack gap="3" mt="3">
              <Button
                colorPalette="teal"
                size="lg"
                onClick={handleSaveGeminiApi}
                loading={geminiSaving}
              >
                <LuSettings />
                Save API Key
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleTestGeminiApi}
                loading={geminiTesting}
              >
                <LuFlaskConical />
                Test API Key
              </Button>
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Default Model
            </Text>
            <NativeSelect.Root size="lg">
              <NativeSelect.Field
                aria-label="Default model"
                title="Default model"
                name="default_model"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.currentTarget.value)}
                bg="bg"
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Default Language
            </Text>
            <NativeSelect.Root size="lg">
              <NativeSelect.Field
                aria-label="Default language"
                title="Default language"
                name="default_language"
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.currentTarget.value)}
                bg="bg"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Callback Base URL
            </Text>
            <Input
              placeholder="https://your-domain.com"
              value={callbackBaseUrl}
              onChange={(e) => setCallbackBaseUrl(e.target.value)}
              bg="bg"
              size="lg"
            />
            <Text fontSize="xs" color="fg.subtle" mt="1">
              When set, Tempolor will POST song results to {callbackBaseUrl || "https://your-domain.com"}/api/song/callback.
              Leave empty to use polling only.
            </Text>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Native Windows Menu
            </Text>
            <Switch
              checked={nativeMenuEnabled}
              onCheckedChange={(details) => setNativeMenuEnabled(details.checked)}
              disabled={!nativeMenuSupported}
            >
              Enable native menu bar (File, Edit, View, Window)
            </Switch>
            <Text fontSize="xs" color="fg.subtle" mt="1">
              {nativeMenuSupported
                ? "Applies to the desktop app after you save settings."
                : "Available only in the Windows desktop app."}
            </Text>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              API Request Logging
            </Text>
            <Switch
              checked={apiRequestLoggingEnabled}
              onCheckedChange={(details) => setApiRequestLoggingEnabled(details.checked)}
            >
              Log Tempolor API requests and responses in the server console
            </Switch>
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Useful for debugging generation issues. Applies after you save settings.
            </Text>
          </Box>

        </Stack>
      </Box>
    </VStack>
  )
}
"use client"

import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Input, NativeSelect, Stack, Text, VStack } from "@chakra-ui/react"
import { LuFlaskConical, LuSettings } from "react-icons/lu"
import { getApiKey, saveApiKey, getSetting, saveSetting, testApiKey } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { toaster } from "@/components/ui/toaster"

const models = ["TemPolor v3", "TemPolor v3.5"]
const languages = ["English", "Dutch", "German", "Spanish", "French", "Korean", "Japanese", "Chinese"]
const nativeMenuSettingKey = "native_windows_menu_enabled"

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

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [defaultModel, setDefaultModel] = useState("TemPolor v3.5")
  const [defaultLanguage, setDefaultLanguage] = useState("English")
  const [nativeMenuEnabled, setNativeMenuEnabled] = useState(false)
  const [nativeMenuSupported, setNativeMenuSupported] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    async function load() {
      const key = await getApiKey()
      if (key) setApiKey(key)
      const model = await getSetting("default_model")
      if (model) setDefaultModel(model)
      const lang = await getSetting("default_language")
      if (lang) setDefaultLanguage(lang)

      const menuBridge = getNativeMenuBridge()
      const supportsNativeMenu = menuBridge?.isSupported() ?? false
      setNativeMenuSupported(supportsNativeMenu)

      const nativeMenuValue = parseBooleanSetting(await getSetting(nativeMenuSettingKey))
      setNativeMenuEnabled(nativeMenuValue)

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
      await testApiKey()
      toaster.success({ title: "Connection successful", description: "Your API key is valid." })
    } catch (error: unknown) {
      toaster.error({ title: "Connection failed", description: getErrorMessage(error) })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveApiKey(apiKey)
      await saveSetting("default_model", defaultModel)
      await saveSetting("default_language", defaultLanguage)
      await saveSetting(nativeMenuSettingKey, nativeMenuEnabled ? "true" : "false")

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
            <Input
              type="password"
              placeholder="Enter your Tempolor API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              bg="bg"
              size="lg"
            />
            <Text fontSize="xs" color="fg.subtle" mt="1">
              Get your key from the Tempolor dashboard
            </Text>
          </Box>

          <Box>
            <Text fontWeight="medium" mb="2" color="fg">
              Default Model
            </Text>
            <NativeSelect.Root size="lg">
              <NativeSelect.Field
                aria-label="Default model"
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

          <HStack gap="3">
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
        </Stack>
      </Box>
    </VStack>
  )
}
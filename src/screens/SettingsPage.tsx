"use client"

import { useState, useEffect } from "react"
import { Box, Button, Heading, HStack, Input, NativeSelect, Stack, Text, VStack } from "@chakra-ui/react"
import { LuFlaskConical, LuSettings } from "react-icons/lu"
import { getApiKey, saveApiKey, getSetting, saveSetting, testApiKey } from "@/lib/api"
import { toaster } from "@/components/ui/toaster"

const models = ["TemPolor v3", "TemPolor v3.5"]
const languages = ["English", "Dutch", "German", "Spanish", "French", "Korean", "Japanese", "Chinese"]

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not reach the API."
}

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [defaultModel, setDefaultModel] = useState("TemPolor v3.5")
  const [defaultLanguage, setDefaultLanguage] = useState("English")
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
    }
    load()
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
      toaster.success({ title: "Settings saved", description: "Your preferences have been updated." })
    } catch {
      toaster.error({ title: "Error", description: "Failed to save settings." })
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
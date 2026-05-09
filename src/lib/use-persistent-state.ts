"use client"

import { useEffect, useState } from "react"

export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key)
      if (storedValue !== null) {
        setValue(JSON.parse(storedValue) as T)
      }
    } catch {
      // Ignore malformed storage entries and fall back to the default value.
    } finally {
      setHydrated(true)
    }
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore storage quota and privacy mode errors.
    }
  }, [hydrated, key, value])

  return [value, setValue]
}

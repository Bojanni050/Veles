"use client"

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import {
  ColorModeProvider,
} from "./color-mode"

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider defaultTheme="dark">
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  )
}

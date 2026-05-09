"use client"

import type { ReactNode } from "react"
import { Provider } from "@/components/ui/provider"
import { Toaster } from "@/components/ui/toaster"
import { PlayerProvider } from "@/lib/player-context"
import { Layout } from "@/components/Layout"

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider>
      <PlayerProvider>
        <Layout>{children}</Layout>
      </PlayerProvider>
      <Toaster />
    </Provider>
  )
}
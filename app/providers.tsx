"use client"

import type { ReactNode } from "react"
import { Provider } from "@/components/ui/provider"
import { Toaster } from "@/components/ui/toaster"

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider>
      {children}
      <Toaster />
    </Provider>
  )
}
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { AppProviders } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Veles",
  description: "Local-first AI song generator powered by Tempolor and SQLite.",
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
function getFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname
    const segment = pathname.split("/").filter(Boolean).pop()
    return segment || "download"
  } catch {
    return "download"
  }
}

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  document.body.append(link)
  link.click()
  link.remove()
}

export async function downloadFile(url: string, filename?: string): Promise<void> {
  const fallbackName = filename ?? getFilenameFromUrl(url)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    triggerDownload(objectUrl, fallbackName)
    URL.revokeObjectURL(objectUrl)
  } catch {
    // Fallback for servers that block fetch/CORS for direct media URLs.
    triggerDownload(url, fallbackName)
  }
}

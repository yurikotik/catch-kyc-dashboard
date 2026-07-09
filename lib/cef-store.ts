import { put, list } from "@vercel/blob"
import type { CEFSnapshot } from "./cef-snapshot"

const LATEST_PATH = "cef-data/latest.json"

function archivePath(date: Date): string {
  return `cef-data/archive/${date.toISOString().slice(0, 10)}.json`
}

export async function saveSnapshot(snapshot: CEFSnapshot): Promise<void> {
  const body = JSON.stringify(snapshot)
  const options = {
    access: "public" as const,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 300,
  }
  await put(LATEST_PATH, body, options)
  // Daily archive lets us rebuild history or debug bad syncs later
  await put(archivePath(new Date()), body, options)
}

export async function loadSnapshot(): Promise<CEFSnapshot | null> {
  try {
    const { blobs } = await list({ prefix: LATEST_PATH, limit: 1 })
    const blob = blobs.find((b) => b.pathname === LATEST_PATH)
    if (!blob) return null
    const res = await fetch(blob.url, { cache: "no-store" })
    if (!res.ok) return null
    const snapshot = (await res.json()) as CEFSnapshot
    if (!Array.isArray(snapshot?.funds) || snapshot.funds.length === 0) return null
    return snapshot
  } catch {
    // Blob store not configured or unreachable — caller falls back to static data
    return null
  }
}

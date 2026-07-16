import { del, list, put } from "@vercel/blob"
import type { CEFData } from "./cef-data"
import type { CEFSnapshot } from "./cef-snapshot"
import { TOP_DISPLAY_COUNT, WATCHLIST_SYMBOLS } from "./watchlist"

const LATEST_PATH = "cef-data/latest.json"
const PREVIOUS_PATH = "cef-data/previous.json"
const STAGING_PATH = "cef-data/staging.json"
const JOB_PATH = "cef-data/job.json"
const DAILY_PRICING_PATH = "cef-data/daily-pricing.json"

export type SyncJobStatus = "idle" | "running" | "complete" | "failed"

export interface SyncJobState {
  status: SyncJobStatus
  tradingDay: string
  completedBatches: number[]
  startedAt: string
  lastBatchAt: string | null
  completedAt: string | null
  errors: string[]
}

export interface DailyPricingCache {
  fetchedAt: string
  dataAsOf: string | null
  rows: Record<string, unknown>
}

function archivePath(date: Date): string {
  return `cef-data/archive/${date.toISOString().slice(0, 10)}.json`
}

function putOptions() {
  return {
    access: "public" as const,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 300,
  }
}

async function loadJsonBlob<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: path, limit: 1 })
    const blob = blobs.find((b) => b.pathname === path)
    if (!blob) return null
    const res = await fetch(blob.url, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function saveJsonBlob(path: string, data: unknown): Promise<void> {
  await put(path, JSON.stringify(data), putOptions())
}

async function deleteJsonBlob(path: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: path, limit: 1 })
    const blob = blobs.find((b) => b.pathname === path)
    if (blob) await del(blob.url)
  } catch {
    // ignore cleanup errors
  }
}

async function deleteArchivesOlderThan(days: number): Promise<void> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const { blobs } = await list({ prefix: "cef-data/archive/" })
  await Promise.all(
    blobs
      .filter((b) => new Date(b.uploadedAt).getTime() < cutoff)
      .map((b) => del(b.url)),
  )
}

export function createInitialStagingSnapshot(previous: CEFSnapshot | null): CEFSnapshot {
  const priorFunds = previous?.watchlist ?? previous?.funds ?? []
  const previousBySymbol = new Map(priorFunds.map((f) => [f.symbol, f]))
  const funds: CEFData[] = []
  for (const symbol of WATCHLIST_SYMBOLS) {
    const prior = previousBySymbol.get(symbol)
    if (prior) funds.push(prior)
  }
  return {
    updatedAt: "",
    dataAsOf: previous?.dataAsOf ?? null,
    source: "cefconnect+barchart",
    syncStatus: "partial",
    fundsProcessed: funds.length,
    universeCount: WATCHLIST_SYMBOLS.length,
    topCount: TOP_DISPLAY_COUNT,
    missingSymbols: [],
    staleSymbols: funds.map((f) => f.symbol),
    errors: [],
    funds,
    watchlist: funds,
  }
}

/** Atomically promote a completed snapshot; keeps only latest + previous + 2-day archives. */
export async function promoteSnapshot(snapshot: CEFSnapshot): Promise<void> {
  const body = JSON.stringify(snapshot)
  const options = putOptions()
  const existing = await loadSnapshot()
  if (existing) {
    await put(PREVIOUS_PATH, JSON.stringify(existing), options)
  }
  await put(LATEST_PATH, body, options)
  await put(archivePath(new Date()), body, options)
  await deleteArchivesOlderThan(2)
}

export async function loadSnapshot(): Promise<CEFSnapshot | null> {
  const snapshot = await loadJsonBlob<CEFSnapshot>(LATEST_PATH)
  if (!snapshot || !Array.isArray(snapshot.funds) || snapshot.funds.length === 0) return null
  return snapshot
}

export async function loadPreviousSnapshot(): Promise<CEFSnapshot | null> {
  return loadJsonBlob<CEFSnapshot>(PREVIOUS_PATH)
}

export async function loadStagingSnapshot(): Promise<CEFSnapshot | null> {
  return loadJsonBlob<CEFSnapshot>(STAGING_PATH)
}

export async function saveStagingSnapshot(snapshot: CEFSnapshot): Promise<void> {
  await saveJsonBlob(STAGING_PATH, snapshot)
}

export async function clearStagingSnapshot(): Promise<void> {
  await deleteJsonBlob(STAGING_PATH)
}

export async function loadSyncJob(): Promise<SyncJobState | null> {
  return loadJsonBlob<SyncJobState>(JOB_PATH)
}

export async function saveSyncJob(job: SyncJobState): Promise<void> {
  await saveJsonBlob(JOB_PATH, job)
}

export async function loadDailyPricingCache(): Promise<DailyPricingCache | null> {
  return loadJsonBlob<DailyPricingCache>(DAILY_PRICING_PATH)
}

export async function saveDailyPricingCache(cache: DailyPricingCache): Promise<void> {
  await saveJsonBlob(DAILY_PRICING_PATH, cache)
}

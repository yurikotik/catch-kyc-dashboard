import { after } from "next/server"
import { computeRank, getTopFunds } from "./cef-data"
import type { CEFData } from "./cef-data"
import type { CEFSnapshot } from "./cef-snapshot"
import { fetchDailyPricing, scrapeFundBatch } from "./cef-scraper"
import {
  clearStagingSnapshot,
  createInitialStagingSnapshot,
  loadDailyPricingCache,
  loadSnapshot,
  loadStagingSnapshot,
  loadSyncJob,
  promoteSnapshot,
  saveDailyPricingCache,
  saveStagingSnapshot,
  saveSyncJob,
  type SyncJobState,
} from "./cef-store"
import { TOP_DISPLAY_COUNT, WATCHLIST_SYMBOLS } from "./watchlist"

type PricingMap = Awaited<ReturnType<typeof fetchDailyPricing>>

const BATCH_SIZE = 2
const TOTAL_BATCHES = Math.ceil(WATCHLIST_SYMBOLS.length / BATCH_SIZE)
/** Delay between chained batch invocations (1.5 min) for polite scraping */
const BATCH_CHAIN_DELAY_MS = 90_000

function tradingDayEt(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${d}`
}

function isWeekdayEt(date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(date)
  return !["Sat", "Sun"].includes(weekday)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getAppBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  return "http://localhost:3000"
}

function mergeFundLists(
  base: CEFData[],
  fresh: CEFData[],
): { funds: CEFData[]; staleSymbols: string[] } {
  const freshMap = new Map(fresh.map((f) => [f.symbol, f]))
  const staleSymbols: string[] = []
  const merged = WATCHLIST_SYMBOLS.map((symbol) => {
    const freshFund = freshMap.get(symbol)
    if (freshFund) return freshFund
    const prior = base.find((f) => f.symbol === symbol)
    if (prior) {
      staleSymbols.push(symbol)
      return prior
    }
    return null
  }).filter((f): f is CEFData => f !== null)
  return { funds: merged, staleSymbols }
}

function finalizeSnapshot(
  watchlist: CEFData[],
  meta: {
    updatedAt: string
    dataAsOf: string | null
    missingSymbols: string[]
    staleSymbols: string[]
    errors: string[]
  },
): CEFSnapshot {
  const rankMap = computeRank(watchlist)
  const rankedWatchlist = [...watchlist]
    .sort((a, b) => (rankMap.get(b.symbol) ?? 0) - (rankMap.get(a.symbol) ?? 0))
    .map((f) => ({ ...f, rank_score: rankMap.get(f.symbol) }))
  const topFunds = getTopFunds(rankedWatchlist, "rank", TOP_DISPLAY_COUNT)

  return {
    updatedAt: meta.updatedAt,
    dataAsOf: meta.dataAsOf,
    source: "cefconnect+barchart",
    syncStatus:
      meta.missingSymbols.length === 0 && meta.staleSymbols.length === 0 && meta.errors.length === 0
        ? "complete"
        : "partial",
    fundsProcessed: topFunds.length,
    universeCount: WATCHLIST_SYMBOLS.length,
    topCount: TOP_DISPLAY_COUNT,
    missingSymbols: meta.missingSymbols,
    staleSymbols: meta.staleSymbols,
    errors: meta.errors,
    funds: topFunds,
    watchlist: rankedWatchlist,
  }
}

async function ensureDailyPricingCache(): Promise<PricingMap> {
  const today = tradingDayEt()
  const cached = await loadDailyPricingCache()
  if (cached && cached.fetchedAt.slice(0, 10) === today && Object.keys(cached.rows).length > 0) {
    const map = new Map<string, PricingMap extends Map<string, infer V> ? V : never>()
    for (const [symbol, row] of Object.entries(cached.rows)) {
      map.set(symbol.toUpperCase(), row as never)
    }
    return map as PricingMap
  }

  const pricing = await fetchDailyPricing()
  let dataAsOf: string | null = null
  for (const row of pricing.values()) {
    if (row.LastUpdated && (!dataAsOf || row.LastUpdated > dataAsOf)) {
      dataAsOf = row.LastUpdated
    }
  }
  await saveDailyPricingCache({
    fetchedAt: new Date().toISOString(),
    dataAsOf,
    rows: Object.fromEntries(pricing.entries()),
  })
  return pricing
}

async function triggerNextBatch(batchIndex: number): Promise<void> {
  const secret = process.env.CRON_SECRET
  if (!secret) return
  const url = `${getAppBaseUrl()}/api/cron/sync-cef?batch=${batchIndex}`
  await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  })
}

function scheduleNextBatch(batchIndex: number): void {
  after(async () => {
    await sleep(BATCH_CHAIN_DELAY_MS)
    try {
      await triggerNextBatch(batchIndex)
    } catch (err) {
      console.error(`Failed to chain batch ${batchIndex}:`, err)
    }
  })
}

export interface BatchResult {
  ok: boolean
  action: "skipped" | "batch" | "completed" | "failed"
  message: string
  batch: number
  job?: SyncJobState
  snapshot?: CEFSnapshot
}

export async function runSyncBatch(batchIndex: number, now = new Date()): Promise<BatchResult> {
  if (!isWeekdayEt(now)) {
    return { ok: true, action: "skipped", message: "Weekend - no sync", batch: batchIndex }
  }
  if (batchIndex < 0 || batchIndex >= TOTAL_BATCHES) {
    return { ok: false, action: "failed", message: `Invalid batch index ${batchIndex}`, batch: batchIndex }
  }

  const tradingDay = tradingDayEt(now)
  let job = await loadSyncJob()

  if (batchIndex === 0) {
    const needsReset =
      !job || job.tradingDay !== tradingDay || job.status === "complete" || job.status === "failed"
    if (needsReset) {
      const previous = await loadSnapshot()
      const staging = createInitialStagingSnapshot(previous)
      await saveStagingSnapshot(staging)
      job = {
        status: "running",
        tradingDay,
        completedBatches: [],
        startedAt: now.toISOString(),
        lastBatchAt: null,
        completedAt: null,
        errors: [],
      }
      await saveSyncJob(job)
      await ensureDailyPricingCache()
    }
  }

  job = (await loadSyncJob()) ?? job
  if (!job || job.tradingDay !== tradingDay) {
    return {
      ok: false,
      action: "failed",
      message: "Sync job not initialized — run batch 0 first",
      batch: batchIndex,
    }
  }

  if (job.completedBatches.includes(batchIndex)) {
    return {
      ok: true,
      action: "skipped",
      message: `Batch ${batchIndex} already completed`,
      batch: batchIndex,
      job,
    }
  }

  if (job.status === "complete") {
    return { ok: true, action: "skipped", message: "Sync already complete for today", batch: batchIndex, job }
  }

  const start = batchIndex * BATCH_SIZE
  const batchSymbols = WATCHLIST_SYMBOLS.slice(start, start + BATCH_SIZE)
  if (batchSymbols.length === 0) {
    return { ok: true, action: "skipped", message: "Empty batch", batch: batchIndex, job }
  }

  try {
    const pricing = await ensureDailyPricingCache()
    let staging = await loadStagingSnapshot()
    if (!staging) {
      if (batchIndex > 0) {
        return {
          ok: false,
          action: "failed",
          message: "Staging snapshot missing — batch 0 must run first",
          batch: batchIndex,
          job,
        }
      }
      staging = createInitialStagingSnapshot(await loadSnapshot())
    }

    const batch = await scrapeFundBatch(batchSymbols, pricing)
    const merged = mergeFundLists(staging.watchlist, batch.funds)
    const missing = Array.from(new Set([...staging.missingSymbols, ...batch.missingSymbols]))
    const errors = [...staging.errors, ...batch.errors]
    const dataAsOf = batch.dataAsOf ?? staging.dataAsOf

    const inProgress: CEFSnapshot = {
      ...staging,
      dataAsOf,
      missingSymbols: missing,
      staleSymbols: merged.staleSymbols,
      errors,
      watchlist: merged.funds,
      funds: staging.funds,
      fundsProcessed: staging.funds.length,
    }
    await saveStagingSnapshot(inProgress)

    const completedBatches = Array.from(new Set([...job.completedBatches, batchIndex])).sort(
      (a, b) => a - b,
    )
    job = {
      ...job,
      status: "running",
      completedBatches,
      lastBatchAt: now.toISOString(),
      errors,
    }

    const isLastBatch = batchIndex === TOTAL_BATCHES - 1
    if (isLastBatch) {
      const finalSnapshot = finalizeSnapshot(merged.funds, {
        updatedAt: now.toISOString(),
        dataAsOf,
        missingSymbols: missing,
        staleSymbols: merged.staleSymbols,
        errors,
      })
      await promoteSnapshot(finalSnapshot)
      await clearStagingSnapshot()
      job = {
        ...job,
        status: "complete",
        completedAt: now.toISOString(),
      }
      await saveSyncJob(job)
      return {
        ok: true,
        action: "completed",
        message: `Sync complete. Top ${TOP_DISPLAY_COUNT} ranked from ${WATCHLIST_SYMBOLS.length} funds.`,
        batch: batchIndex,
        job,
        snapshot: finalSnapshot,
      }
    }

    await saveSyncJob(job)
    scheduleNextBatch(batchIndex + 1)

    return {
      ok: true,
      action: "batch",
      message: `Processed ${batchSymbols.join(", ")} (batch ${batchIndex + 1}/${TOTAL_BATCHES}). Next batch in ${BATCH_CHAIN_DELAY_MS / 1000}s.`,
      batch: batchIndex,
      job,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    job = {
      ...job,
      status: "failed",
      completedAt: now.toISOString(),
      errors: [...job.errors, `batch ${batchIndex}: ${message}`],
    }
    await saveSyncJob(job)
    return { ok: false, action: "failed", message, batch: batchIndex, job }
  }
}

export { TOTAL_BATCHES, BATCH_CHAIN_DELAY_MS }

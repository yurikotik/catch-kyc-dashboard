import { computeRank, getTopFunds } from "./cef-data"
import type { CEFData } from "./cef-data"
import type { CEFSnapshot } from "./cef-snapshot"
import { fetchDailyPricing, scrapeFundBatch } from "./cef-scraper"
import {
  loadSnapshot,
  loadSyncJob,
  promoteSnapshot,
  saveSyncJob,
  type SyncJobState,
} from "./cef-store"
import { TOP_DISPLAY_COUNT, WATCHLIST_SYMBOLS } from "./watchlist"

type PricingMap = Awaited<ReturnType<typeof fetchDailyPricing>>

/**
 * How many funds to scrape in parallel per wave. The full universe scrapes in
 * ~7s all-at-once, but we cap concurrency to stay polite to CEF Connect and
 * Barchart (avoid a burst of 48 simultaneous requests from one Vercel IP).
 */
const SCRAPE_CONCURRENCY = 12

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Merge freshly scraped funds over any prior snapshot. Symbols that failed this
 * run fall back to their previous value and are reported as stale.
 */
function mergeFundLists(
  base: CEFData[],
  fresh: CEFData[],
): { funds: CEFData[]; staleSymbols: string[] } {
  const freshMap = new Map(fresh.map((f) => [f.symbol, f]))
  const baseMap = new Map(base.map((f) => [f.symbol, f]))
  const staleSymbols: string[] = []
  const merged = WATCHLIST_SYMBOLS.map((symbol) => {
    const freshFund = freshMap.get(symbol)
    if (freshFund) return freshFund
    const prior = baseMap.get(symbol)
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

async function scrapeAllFunds(pricing: PricingMap): Promise<{
  funds: CEFData[]
  missingSymbols: string[]
  errors: string[]
  dataAsOf: string | null
}> {
  const funds: CEFData[] = []
  const missingSymbols: string[] = []
  const errors: string[] = []
  let dataAsOf: string | null = null

  for (const wave of chunk(WATCHLIST_SYMBOLS, SCRAPE_CONCURRENCY)) {
    const result = await scrapeFundBatch(wave, pricing)
    funds.push(...result.funds)
    missingSymbols.push(...result.missingSymbols)
    errors.push(...result.errors)
    if (result.dataAsOf && (!dataAsOf || result.dataAsOf > dataAsOf)) {
      dataAsOf = result.dataAsOf
    }
  }

  return { funds, missingSymbols, errors, dataAsOf }
}

export interface SyncResult {
  ok: boolean
  action: "skipped" | "completed" | "failed"
  message: string
  job?: SyncJobState
  snapshot?: CEFSnapshot
}

/**
 * Run the entire daily sync in a single invocation: scrape the full watchlist,
 * rank it, promote the Top N. The universe scrapes in a few seconds, so there
 * is no chaining, no staging, and nothing that can stall mid-run.
 */
export async function runFullSync(now = new Date()): Promise<SyncResult> {
  if (!isWeekdayEt(now)) {
    return { ok: true, action: "skipped", message: "Weekend - no sync" }
  }

  const tradingDay = tradingDayEt(now)
  let job: SyncJobState = {
    status: "running",
    tradingDay,
    completedBatches: [],
    startedAt: now.toISOString(),
    lastBatchAt: now.toISOString(),
    completedAt: null,
    errors: [],
  }
  await saveSyncJob(job)

  try {
    const pricing = await fetchDailyPricing()
    const previous = await loadSnapshot()
    const scraped = await scrapeAllFunds(pricing)

    const priorFunds = previous?.watchlist ?? previous?.funds ?? []
    const merged = mergeFundLists(priorFunds, scraped.funds)

    const snapshot = finalizeSnapshot(merged.funds, {
      updatedAt: now.toISOString(),
      dataAsOf: scraped.dataAsOf ?? previous?.dataAsOf ?? null,
      missingSymbols: scraped.missingSymbols,
      staleSymbols: merged.staleSymbols,
      errors: scraped.errors,
    })

    if (snapshot.watchlist.length === 0) {
      throw new Error("Scrape produced no funds and no prior snapshot to fall back on")
    }

    await promoteSnapshot(snapshot)

    job = {
      ...job,
      status: "complete",
      completedBatches: [0],
      lastBatchAt: now.toISOString(),
      completedAt: now.toISOString(),
      errors: scraped.errors,
    }
    await saveSyncJob(job)

    return {
      ok: true,
      action: "completed",
      message: `Synced ${scraped.funds.length}/${WATCHLIST_SYMBOLS.length} funds; ranked Top ${TOP_DISPLAY_COUNT}.`,
      job,
      snapshot,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    job = {
      ...job,
      status: "failed",
      completedAt: now.toISOString(),
      errors: [...job.errors, message],
    }
    await saveSyncJob(job)
    return { ok: false, action: "failed", message, job }
  }
}

import type { CEFData } from "./cef-data"
import { cefData } from "./cef-data"

/**
 * Scraper for CEF Connect's JSON endpoints.
 *
 * Endpoints used:
 *  - GET /api/v3/DailyPricing            -> full CEF universe, one request
 *  - GET /api/v3/pricinghistory/{T}/5Y   -> per-fund daily price/NAV/discount history
 *
 * Requests are made sequentially with a randomized delay between each
 * per-fund call to keep the scraping footprint polite.
 */

const BASE_URL = "https://www.cefconnect.com/api/v3"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

// Tickers the dashboard tracks: every fund present in the current dataset.
export const TRACKED_SYMBOLS: string[] = cefData.map((f) => f.symbol)

// Polite-scraping knobs
const MIN_DELAY_MS = 2500
const JITTER_MS = 1500
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 4000
const REQUEST_TIMEOUT_MS = 20000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function politeDelay(): Promise<void> {
  return sleep(MIN_DELAY_MS + Math.random() * JITTER_MS)
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // 4s, 8s, 16s exponential backoff between retries
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      })
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} from ${url}`)
        continue // retryable
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`)
      }
      return await res.json()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

// ---------------------------------------------------------------------------
// Daily pricing (whole universe)
// ---------------------------------------------------------------------------

interface DailyPricingRow {
  Ticker: string
  Name: string
  Price: number | null
  NAV: number | null
  /** Premium/discount percent; positive = premium, negative = discount */
  Discount: number | null
  DistributionRatePrice: number | null
  LeverageRatioPercentage: number | null
  AvgDailyVolume: number | null
  ZScore1Yr: number | null
  LastUpdated: string | null
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

export async function fetchDailyPricing(): Promise<Map<string, DailyPricingRow>> {
  const raw = await fetchJsonWithRetry(`${BASE_URL}/DailyPricing`)
  if (!Array.isArray(raw)) {
    throw new Error("DailyPricing: unexpected response shape (expected array)")
  }
  const map = new Map<string, DailyPricingRow>()
  for (const row of raw as DailyPricingRow[]) {
    const ticker = typeof row?.Ticker === "string" ? row.Ticker.toUpperCase().trim() : ""
    if (ticker) map.set(ticker, row)
  }
  if (map.size === 0) {
    throw new Error("DailyPricing: response contained no funds")
  }
  return map
}

// ---------------------------------------------------------------------------
// Per-fund pricing history (for 3Y/5Y z-scores + trend)
// ---------------------------------------------------------------------------

interface HistoryPoint {
  /** Market price */
  Data: number | null
  NAVData: number | null
  /** Premium/discount percent (positive = premium) */
  DiscountData: number | null
  DataDate: string
}

async function fetchPricingHistory(symbol: string): Promise<HistoryPoint[]> {
  const raw = (await fetchJsonWithRetry(
    `${BASE_URL}/pricinghistory/${encodeURIComponent(symbol)}/5Y`,
  )) as { Data?: { PriceHistory?: HistoryPoint[] } }
  const history = raw?.Data?.PriceHistory
  if (!Array.isArray(history)) {
    throw new Error(`pricinghistory ${symbol}: unexpected response shape`)
  }
  return history
    .filter((p) => p && typeof p.DataDate === "string")
    .sort((a, b) => a.DataDate.localeCompare(b.DataDate))
}

/**
 * Z-score of the current premium/discount vs its mean/stddev over the last
 * `windowDays`. Returns null when there isn't enough history (young funds)
 * or the series has no variance.
 */
function computeZScore(history: HistoryPoint[], windowDays: number): number | null {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000
  const series = history
    .filter((p) => new Date(p.DataDate).getTime() >= cutoff && isFiniteNumber(p.DiscountData))
    .map((p) => p.DiscountData as number)
  // The history is weekly-ish sampled; require ~60% coverage of the window
  const expectedPoints = (windowDays / 7) * 0.6
  if (series.length < Math.max(10, expectedPoints)) return null

  const current = series[series.length - 1]
  const mean = series.reduce((s, v) => s + v, 0) / series.length
  const variance = series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length
  const std = Math.sqrt(variance)
  if (std < 1e-6) return null
  return Number((((current as number) - mean) / std).toFixed(2))
}

/**
 * Momentum score 0-100 from price history (higher = stronger recent momentum):
 * blends 1M/3M/6M price returns via tanh squashing around a neutral 50.
 */
function computeTrend(history: HistoryPoint[]): number | null {
  const prices = history.filter((p) => isFiniteNumber(p.Data))
  if (prices.length < 8) return null

  const latest = prices[prices.length - 1]
  const priceAt = (daysAgo: number): number | null => {
    const target = Date.now() - daysAgo * 24 * 60 * 60 * 1000
    let best: HistoryPoint | null = null
    let bestDist = Number.POSITIVE_INFINITY
    for (const p of prices) {
      const dist = Math.abs(new Date(p.DataDate).getTime() - target)
      if (dist < bestDist) {
        bestDist = dist
        best = p
      }
    }
    // reject if the closest sample is more than 3 weeks from the target date
    if (!best || bestDist > 21 * 24 * 60 * 60 * 1000) return null
    return best.Data as number
  }

  const current = latest.Data as number
  const returnPct = (past: number | null): number | null =>
    past && past > 0 ? ((current - past) / past) * 100 : null

  const r1 = returnPct(priceAt(30))
  const r3 = returnPct(priceAt(91))
  const r6 = returnPct(priceAt(182))
  if (r1 === null && r3 === null && r6 === null) return null

  let score = 50
  if (r1 !== null) score += 25 * Math.tanh(r1 / 5)
  if (r3 !== null) score += 15 * Math.tanh(r3 / 10)
  if (r6 !== null) score += 10 * Math.tanh(r6 / 15)
  return Math.round(Math.min(100, Math.max(0, score)))
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface ScrapeResult {
  funds: CEFData[]
  dataAsOf: string | null
  missingSymbols: string[]
  errors: string[]
}

export async function scrapeTrackedFunds(
  symbols: string[] = TRACKED_SYMBOLS,
): Promise<ScrapeResult> {
  const errors: string[] = []
  const missingSymbols: string[] = []
  const funds: CEFData[] = []

  const universe = await fetchDailyPricing()

  let dataAsOf: string | null = null

  for (const symbol of symbols) {
    const row = universe.get(symbol.toUpperCase())
    if (!row) {
      // Fund not in the live universe (merged, liquidated, or renamed)
      missingSymbols.push(symbol)
      continue
    }

    if (!isFiniteNumber(row.Price) || !isFiniteNumber(row.NAV) || row.NAV <= 0) {
      errors.push(`${symbol}: missing or invalid price/NAV, skipped`)
      continue
    }

    if (row.LastUpdated && (!dataAsOf || row.LastUpdated > dataAsOf)) {
      dataAsOf = row.LastUpdated
    }

    const discount = isFiniteNumber(row.Discount)
      ? row.Discount
      : Number((((row.Price - row.NAV) / row.NAV) * 100).toFixed(2))

    // Per-fund history call (polite delay before each one)
    let zscore3y: number | null = null
    let zscore5y: number | null = null
    let zscore1yFromHistory: number | null = null
    let trend: number | null = null
    try {
      await politeDelay()
      const history = await fetchPricingHistory(symbol)
      zscore1yFromHistory = computeZScore(history, 365)
      zscore3y = computeZScore(history, 365 * 3)
      zscore5y = computeZScore(history, 365 * 5)
      trend = computeTrend(history)
    } catch (err) {
      errors.push(`${symbol}: history fetch failed (${err instanceof Error ? err.message : err})`)
    }

    const zscore1y = isFiniteNumber(row.ZScore1Yr) ? row.ZScore1Yr : zscore1yFromHistory
    if (zscore1y === null) {
      errors.push(`${symbol}: no 1Y z-score available, skipped`)
      continue
    }

    funds.push({
      symbol: symbol.toUpperCase(),
      name: typeof row.Name === "string" && row.Name.trim() ? row.Name.trim() : symbol,
      price: row.Price,
      nav: row.NAV,
      discount,
      zscore_1y: zscore1y,
      zscore_3y: zscore3y,
      zscore_5y: zscore5y,
      distribution_rate: isFiniteNumber(row.DistributionRatePrice) ? row.DistributionRatePrice : 0,
      leverage: isFiniteNumber(row.LeverageRatioPercentage) ? row.LeverageRatioPercentage : 0,
      trend: trend ?? 50, // neutral momentum when history is unavailable
      volume: isFiniteNumber(row.AvgDailyVolume) ? Math.round(row.AvgDailyVolume) : 0,
    })
  }

  if (funds.length === 0) {
    throw new Error(
      `Scrape produced no funds. Missing: [${missingSymbols.join(", ")}]. Errors: ${errors.join("; ")}`,
    )
  }

  return { funds, dataAsOf, missingSymbols, errors }
}

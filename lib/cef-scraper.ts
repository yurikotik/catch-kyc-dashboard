import type { CEFData, ZScoreWindow } from "./cef-data"
import { computeTechnicalRating, distributionAdjustedCloses } from "./technical"
import { WATCHLIST_SYMBOLS } from "./watchlist"

const BASE_URL = "https://www.cefconnect.com/api/v3"
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 4000
const REQUEST_TIMEOUT_MS = 20000

export const TRACKED_SYMBOLS: string[] = WATCHLIST_SYMBOLS

/**
 * CEF Connect is inconsistent about numeric encoding - some edges answer with
 * bare numbers, others with numeric strings ("9.36", "9.36%"). Every numeric
 * field is therefore typed loosely and run through `toNumber` at the boundary.
 * A strict `typeof v === "number"` check is what silently turned the whole
 * watchlist's distribution rate into 0%.
 */
type Numeric = number | string | null | undefined

interface DailyPricingRow {
  Ticker: string
  Name: string
  Price: Numeric
  NAV: Numeric
  Discount: Numeric
  DistributionRatePrice: Numeric
  DistributionRateNAV: Numeric
  CurrentDistribution: Numeric
  DistributionFrequency: string | null
  LeverageRatioPercentage: Numeric
  AvgDailyVolume: Numeric
  ZScore1Yr: Numeric
  LastUpdated: string | null
}

interface HistoryPoint {
  Data: Numeric
  NAVData: Numeric
  DiscountData: Numeric
  DataDate: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Coerce a number-or-numeric-string field; null when it is not a usable number. */
function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    const cleaned = v.replace(/[$%,\s]/g, "")
    if (!cleaned) return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      })
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} from ${url}`)
        continue
      }
      if (res.status !== 200) throw new Error(`HTTP ${res.status} from ${url}`)
      return await res.json()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function fetchDailyPricing(): Promise<Map<string, DailyPricingRow>> {
  const raw = await fetchJsonWithRetry(`${BASE_URL}/DailyPricing`)
  if (!Array.isArray(raw)) throw new Error("DailyPricing: unexpected response shape")
  const map = new Map<string, DailyPricingRow>()
  for (const row of raw as DailyPricingRow[]) {
    const ticker = typeof row?.Ticker === "string" ? row.Ticker.toUpperCase().trim() : ""
    if (ticker) map.set(ticker, row)
  }
  if (map.size === 0) throw new Error("DailyPricing: response contained no funds")
  return map
}

/**
 * CEF Connect serves different granularity per window: 5Y comes back weekly
 * (~250 points), 1Y comes back daily (~250 points). We need both - weekly for
 * the long z-score lookbacks, daily for the technical indicators.
 */
async function fetchPricingHistory(
  symbol: string,
  window: "5Y" | "1Y" = "5Y",
): Promise<HistoryPoint[]> {
  const raw = (await fetchJsonWithRetry(
    `${BASE_URL}/pricinghistory/${encodeURIComponent(symbol)}/${window}`,
  )) as { Data?: { PriceHistory?: HistoryPoint[] } }
  const history = raw?.Data?.PriceHistory
  if (!Array.isArray(history)) throw new Error(`pricinghistory ${symbol}: unexpected shape`)
  return history
    .filter((p) => p && typeof p.DataDate === "string")
    .sort((a, b) => a.DataDate.localeCompare(b.DataDate))
}

function computeZScore(history: HistoryPoint[], windowDays: number): number | null {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000
  const series = history
    .filter((p) => new Date(p.DataDate).getTime() >= cutoff)
    .map((p) => toNumber(p.DiscountData))
    .filter((v): v is number => v !== null)
  const expectedPoints = (windowDays / 7) * 0.6
  if (series.length < Math.max(10, expectedPoints)) return null
  const current = series[series.length - 1]
  const mean = series.reduce((s, v) => s + v, 0) / series.length
  const variance = series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length
  const std = Math.sqrt(variance)
  if (std < 1e-6) return null
  return Number((((current as number) - mean) / std).toFixed(2))
}

function computeTrend(history: HistoryPoint[]): number | null {
  const prices = history
    .map((p) => ({ ...p, Data: toNumber(p.Data) }))
    .filter((p) => p.Data !== null)
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

const DISTRIBUTIONS_PER_YEAR: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  "semi-annual": 2,
  semiannual: 2,
  annual: 1,
  annually: 1,
}

/**
 * Current distribution yield on price. Falls back to the NAV-based rate, then
 * to annualising the declared distribution, so a missing field is reported as
 * unknown rather than silently written out as a 0% yield.
 */
function resolveDistributionRate(row: DailyPricingRow): number | null {
  const onPrice = toNumber(row.DistributionRatePrice)
  if (onPrice !== null && onPrice > 0) return Number(onPrice.toFixed(2))

  const onNav = toNumber(row.DistributionRateNAV)
  if (onNav !== null && onNav > 0) return Number(onNav.toFixed(2))

  const periods =
    typeof row.DistributionFrequency === "string"
      ? DISTRIBUTIONS_PER_YEAR[row.DistributionFrequency.trim().toLowerCase()]
      : undefined
  const distribution = toNumber(row.CurrentDistribution)
  const price = toNumber(row.Price)
  if (periods && distribution !== null && distribution > 0 && price !== null && price > 0) {
    return Number((((distribution * periods) / price) * 100).toFixed(2))
  }
  return null
}

function pickEffectiveZScore(
  z1: number | null,
  z3: number | null,
  z5: number | null,
): { value: number; window: ZScoreWindow } | null {
  if (z5 !== null) return { value: z5, window: "5Y" }
  if (z3 !== null) return { value: z3, window: "3Y" }
  if (z1 !== null) return { value: z1, window: "1Y" }
  return null
}

export interface ScrapeFundResult {
  fund: CEFData | null
  error?: string
  missing?: boolean
}

export async function scrapeSingleFund(
  symbol: string,
  universe: Map<string, DailyPricingRow>,
): Promise<ScrapeFundResult> {
  const row = universe.get(symbol.toUpperCase())
  if (!row) return { fund: null, missing: true }

  const price = toNumber(row.Price)
  const nav = toNumber(row.NAV)
  if (price === null || nav === null || nav <= 0) {
    return { fund: null, error: `${symbol}: missing or invalid price/NAV` }
  }

  const discount = toNumber(row.Discount) ?? Number((((price - nav) / nav) * 100).toFixed(2))

  const distribution_rate = resolveDistributionRate(row)
  if (distribution_rate === null) {
    return { fund: null, error: `${symbol}: no distribution rate available` }
  }

  let zscore3y: number | null = null
  let zscore5y: number | null = null
  let zscore1yFromHistory: number | null = null
  let trend: number | null = null
  let technical_rating: number | null = null
  let technical_signal: string | null = null

  try {
    const [weekly, daily] = await Promise.all([
      fetchPricingHistory(symbol, "5Y"),
      fetchPricingHistory(symbol, "1Y"),
    ])
    zscore1yFromHistory = computeZScore(weekly, 365)
    zscore3y = computeZScore(weekly, 365 * 3)
    zscore5y = computeZScore(weekly, 365 * 5)
    trend = computeTrend(weekly)

    // Indicators run on a distribution-adjusted series; the raw price series
    // drifts down by roughly the payout rate and would read as a false sell.
    const points = daily
      .map((p) => ({ date: p.DataDate, close: toNumber(p.Data) }))
      .filter((p): p is { date: string; close: number } => p.close !== null && p.close > 0)
    const technical = computeTechnicalRating(
      distributionAdjustedCloses(points, distribution_rate),
    )
    if (technical) {
      technical_rating = technical.rating
      technical_signal = technical.signal
    }
  } catch (err) {
    return {
      fund: null,
      error: `${symbol}: fetch failed (${err instanceof Error ? err.message : err})`,
    }
  }

  const zscore1y = toNumber(row.ZScore1Yr) ?? zscore1yFromHistory
  const effective = pickEffectiveZScore(zscore1y, zscore3y, zscore5y)
  if (!effective || zscore1y === null) {
    return { fund: null, error: `${symbol}: no z-score available` }
  }

  return {
    fund: {
      symbol: symbol.toUpperCase(),
      name: typeof row.Name === "string" && row.Name.trim() ? row.Name.trim() : symbol,
      price,
      nav,
      discount,
      zscore_1y: zscore1y,
      zscore_3y: zscore3y,
      zscore_5y: zscore5y,
      zscore_effective: effective.value,
      zscore_window: effective.window,
      distribution_rate,
      leverage: toNumber(row.LeverageRatioPercentage),
      trend: trend ?? 50,
      technical_rating,
      technical_signal,
      volume: Math.round(toNumber(row.AvgDailyVolume) ?? 0),
    },
  }
}

export interface ScrapeBatchResult {
  funds: CEFData[]
  missingSymbols: string[]
  errors: string[]
  dataAsOf: string | null
}

export async function scrapeFundBatch(
  symbols: string[],
  universe?: Map<string, DailyPricingRow>,
): Promise<ScrapeBatchResult> {
  const pricing = universe ?? (await fetchDailyPricing())
  const funds: CEFData[] = []
  const missingSymbols: string[] = []
  const errors: string[] = []
  let dataAsOf: string | null = null

  for (const symbol of symbols) {
    const row = pricing.get(symbol.toUpperCase())
    if (row?.LastUpdated && (!dataAsOf || row.LastUpdated > dataAsOf)) {
      dataAsOf = row.LastUpdated
    }
  }

  const results = await Promise.all(symbols.map((symbol) => scrapeSingleFund(symbol, pricing)))

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    const result = results[i]
    if (result.missing) {
      missingSymbols.push(symbol)
      continue
    }
    if (result.error) {
      errors.push(result.error)
      continue
    }
    if (result.fund) funds.push(result.fund)
  }

  return { funds, missingSymbols, errors, dataAsOf }
}

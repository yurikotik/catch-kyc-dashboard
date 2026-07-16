import type { CEFData, ZScoreWindow } from "./cef-data"
import { fetchBarchartTechnical } from "./barchart-scraper"
import { WATCHLIST_SYMBOLS } from "./watchlist"

const BASE_URL = "https://www.cefconnect.com/api/v3"
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 4000
const REQUEST_TIMEOUT_MS = 20000

export const TRACKED_SYMBOLS: string[] = WATCHLIST_SYMBOLS

interface DailyPricingRow {
  Ticker: string
  Name: string
  Price: number | null
  NAV: number | null
  Discount: number | null
  DistributionRatePrice: number | null
  LeverageRatioPercentage: number | null
  AvgDailyVolume: number | null
  ZScore1Yr: number | null
  LastUpdated: string | null
}

interface HistoryPoint {
  Data: number | null
  NAVData: number | null
  DiscountData: number | null
  DataDate: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
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
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
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

async function fetchPricingHistory(symbol: string): Promise<HistoryPoint[]> {
  const raw = (await fetchJsonWithRetry(
    `${BASE_URL}/pricinghistory/${encodeURIComponent(symbol)}/5Y`,
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
    .filter(
      (p) =>
        new Date(p.DataDate).getTime() >= cutoff && isFiniteNumber(p.DiscountData),
    )
    .map((p) => p.DiscountData as number)
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

  if (!isFiniteNumber(row.Price) || !isFiniteNumber(row.NAV) || row.NAV <= 0) {
    return { fund: null, error: `${symbol}: missing or invalid price/NAV` }
  }

  const discount = isFiniteNumber(row.Discount)
    ? row.Discount
    : Number((((row.Price - row.NAV) / row.NAV) * 100).toFixed(2))

  let zscore3y: number | null = null
  let zscore5y: number | null = null
  let zscore1yFromHistory: number | null = null
  let trend: number | null = null
  let technical_rating = 50
  let technical_signal: string | null = null

  try {
    const [history, technical] = await Promise.all([
      fetchPricingHistory(symbol),
      fetchBarchartTechnical(symbol),
    ])
    zscore1yFromHistory = computeZScore(history, 365)
    zscore3y = computeZScore(history, 365 * 3)
    zscore5y = computeZScore(history, 365 * 5)
    trend = computeTrend(history)
    technical_rating = technical.technicalRating
    technical_signal = technical.signal
  } catch (err) {
    return {
      fund: null,
      error: `${symbol}: fetch failed (${err instanceof Error ? err.message : err})`,
    }
  }

  const zscore1y = isFiniteNumber(row.ZScore1Yr) ? row.ZScore1Yr : zscore1yFromHistory
  const effective = pickEffectiveZScore(zscore1y, zscore3y, zscore5y)
  if (!effective || zscore1y === null) {
    return { fund: null, error: `${symbol}: no z-score available` }
  }

  return {
    fund: {
      symbol: symbol.toUpperCase(),
      name: typeof row.Name === "string" && row.Name.trim() ? row.Name.trim() : symbol,
      price: row.Price,
      nav: row.NAV,
      discount,
      zscore_1y: zscore1y,
      zscore_3y: zscore3y,
      zscore_5y: zscore5y,
      zscore_effective: effective.value,
      zscore_window: effective.window,
      distribution_rate: isFiniteNumber(row.DistributionRatePrice)
        ? row.DistributionRatePrice
        : 0,
      leverage: isFiniteNumber(row.LeverageRatioPercentage) ? row.LeverageRatioPercentage : 0,
      trend: trend ?? 50,
      technical_rating,
      technical_signal,
      volume: isFiniteNumber(row.AvgDailyVolume) ? Math.round(row.AvgDailyVolume) : 0,
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

/**
 * Technical rating computed from daily price history.
 *
 * Barchart's quote pages sit behind an AWS WAF JS challenge (they answer
 * HTTP 202 with a challenge document instead of the quote), so the old HTML
 * scrape could never read a rating and silently reported 50 for every fund.
 * We derive the rating ourselves instead, from the daily price series CEF
 * Connect already serves.
 *
 * The shape mirrors Barchart's Technical Opinion: a basket of short, medium
 * and long term indicators each vote buy (+1) / hold (0) / sell (-1), and the
 * average vote maps onto 0-100 where 100 is the strongest buy.
 */

export interface TechnicalResult {
  /** 0-100 composite buy rating (100 = strongest buy) */
  rating: number
  /** Buy / Sell / Hold label */
  signal: "Buy" | "Sell" | "Hold"
  /** How many indicators had enough history to vote */
  indicatorsUsed: number
}

type Vote = -1 | 0 | 1

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  let sum = 0
  for (let i = values.length - period; i < values.length; i++) sum += values[i]
  return sum / period
}

function ema(values: number[], period: number): number | null {
  if (values.length < period) return null
  const k = 2 / (period + 1)
  let acc = values.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < values.length; i++) acc = values[i] * k + acc * (1 - k)
  return acc
}

/** Price relative to its moving average. */
function maVote(values: number[], period: number): Vote | null {
  const avg = sma(values, period)
  if (avg === null || avg <= 0) return null
  const diff = (values[values.length - 1] - avg) / avg
  if (diff > 0.005) return 1
  if (diff < -0.005) return -1
  return 0
}

/** MACD-style oscillator: fast EMA above slow EMA is bullish. */
function macdVote(values: number[], fast: number, slow: number): Vote | null {
  const f = ema(values, fast)
  const s = ema(values, slow)
  if (f === null || s === null || s <= 0) return null
  const diff = (f - s) / s
  if (diff > 0.002) return 1
  if (diff < -0.002) return -1
  return 0
}

/** Position inside the n-period Donchian high/low channel. */
function donchianVote(values: number[], period: number): Vote | null {
  if (values.length < period) return null
  const window = values.slice(-period)
  const high = Math.max(...window)
  const low = Math.min(...window)
  if (high - low < 1e-9) return 0
  const pos = (values[values.length - 1] - low) / (high - low)
  if (pos > 0.7) return 1
  if (pos < 0.3) return -1
  return 0
}

/** Bollinger position: how many standard deviations from the mean. */
function bollingerVote(values: number[], period: number): Vote | null {
  const avg = sma(values, period)
  if (avg === null) return null
  const window = values.slice(-period)
  const variance = window.reduce((s, v) => s + (v - avg) ** 2, 0) / window.length
  const std = Math.sqrt(variance)
  if (std < 1e-9) return 0
  const z = (values[values.length - 1] - avg) / std
  if (z > 0.5) return 1
  if (z < -0.5) return -1
  return 0
}

/** Rate of change over n periods. */
function rocVote(values: number[], period: number): Vote | null {
  if (values.length <= period) return null
  const past = values[values.length - 1 - period]
  if (!(past > 0)) return null
  const change = (values[values.length - 1] - past) / past
  if (change > 0.01) return 1
  if (change < -0.01) return -1
  return 0
}

/**
 * Composite technical rating from a daily close series (oldest first).
 * Returns null when the series is too short for a meaningful read.
 */
export function computeTechnicalRating(closes: number[]): TechnicalResult | null {
  const prices = closes.filter((p) => Number.isFinite(p) && p > 0)
  if (prices.length < 25) return null

  const votes: (Vote | null)[] = [
    // Short term
    maVote(prices, 20),
    macdVote(prices, 20, 50),
    donchianVote(prices, 20),
    bollingerVote(prices, 20),
    rocVote(prices, 20),
    // Medium term
    maVote(prices, 50),
    macdVote(prices, 50, 100),
    donchianVote(prices, 50),
    rocVote(prices, 50),
    // Long term
    maVote(prices, 100),
    macdVote(prices, 20, 100),
    donchianVote(prices, 100),
    rocVote(prices, 100),
  ]

  const cast = votes.filter((v): v is Vote => v !== null)
  if (cast.length < 4) return null

  const avg = cast.reduce<number>((s, v) => s + v, 0) / cast.length
  const rating = Math.round(((avg + 1) / 2) * 100)
  const signal: TechnicalResult["signal"] = rating >= 60 ? "Buy" : rating <= 40 ? "Sell" : "Hold"

  return { rating: Math.max(0, Math.min(100, rating)), signal, indicatorsUsed: cast.length }
}

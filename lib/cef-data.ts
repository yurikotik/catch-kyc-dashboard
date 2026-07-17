export type ZScoreWindow = "1Y" | "3Y" | "5Y"

export interface CEFData {
  symbol: string
  name: string
  price: number
  nav: number
  discount: number
  zscore_1y: number
  zscore_3y: number | null
  zscore_5y: number | null
  /** Longest available z-score used for ranking (5Y > 3Y > 1Y) */
  zscore_effective: number
  zscore_window: ZScoreWindow
  distribution_rate: number
  leverage: number
  trend: number // momentum score 0-100 (higher = stronger buy signal)
  /** Barchart Technical Opinion buy rating 0-100 */
  technical_rating: number
  technical_signal: string | null
  volume: number
  rank_score?: number
}

export type SortMetric =
  | "rank"
  | "zscore"
  | "zscore_1y"
  | "discount"
  | "distribution_rate"
  | "trend"
  | "technical"

// Static fallback sample (subset). Live data comes from Blob after sync.
export const cefData: CEFData[] = []

export function getEffectiveZScore(fund: CEFData): number {
  return fund.zscore_effective ?? fund.zscore_1y
}

function percentileRanks(values: number[], direction: "asc" | "desc"): number[] {
  const n = values.length
  if (n <= 1) return values.map(() => 100)
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => (direction === "asc" ? a.v - b.v : b.v - a.v))
  const ranks = new Array<number>(n)
  indexed.forEach((item, rank) => {
    ranks[item.i] = Math.round(((n - 1 - rank) / (n - 1)) * 100)
  })
  return ranks
}

/**
 * Composite rank across the watchlist universe:
 * 40% Z-score (longest available) + 20% yield + 20% technical + 20% discount.
 * Each pillar is percentile-ranked within the provided universe.
 */
export function computeRank(data: CEFData[]): Map<string, number> {
  const zRanks = percentileRanks(data.map((d) => getEffectiveZScore(d)), "asc")
  const yRanks = percentileRanks(data.map((d) => d.distribution_rate), "desc")
  const tRanks = percentileRanks(data.map((d) => d.technical_rating), "desc")
  const dRanks = percentileRanks(data.map((d) => d.discount), "asc")

  const rankMap = new Map<string, number>()
  data.forEach((fund, i) => {
    const score = Math.round(
      zRanks[i] * 0.4 + yRanks[i] * 0.2 + tRanks[i] * 0.2 + dRanks[i] * 0.2,
    )
    rankMap.set(fund.symbol, score)
  })
  return rankMap
}

export function getTopFunds(data: CEFData[], metric: SortMetric, count: number): CEFData[] {
  if (metric === "rank") {
    const rankMap = computeRank(data)
    const sorted = [...data].sort(
      (a, b) => (rankMap.get(b.symbol) ?? 0) - (rankMap.get(a.symbol) ?? 0),
    )
    return sorted.slice(0, count).map((f) => ({
      ...f,
      rank_score: rankMap.get(f.symbol),
    }))
  }

  const sorted = [...data].sort((a, b) => {
    if (metric === "zscore" || metric === "zscore_1y")
      return getEffectiveZScore(a) - getEffectiveZScore(b)
    if (metric === "discount") return a.discount - b.discount
    if (metric === "distribution_rate") return b.distribution_rate - a.distribution_rate
    if (metric === "trend") return b.trend - a.trend
    if (metric === "technical") return b.technical_rating - a.technical_rating
    return 0
  })
  return sorted.slice(0, count)
}

/** Brand-aligned heat colors (Game of Yield success / gold / danger scale) */
export function getZScoreColor(zscore: number): string {
  if (zscore <= -2.5) return "bg-[var(--gy-heat-best)]"
  if (zscore <= -2.0) return "bg-[var(--gy-heat-good)]"
  if (zscore <= -1.5) return "bg-[var(--gy-heat-mid-good)]"
  if (zscore <= -1.0) return "bg-[var(--gy-heat-mid)]"
  if (zscore <= -0.5) return "bg-[var(--gy-heat-mid-warm)]"
  if (zscore <= 0.5) return "bg-[var(--gy-heat-warm)]"
  if (zscore <= 1.0) return "bg-[var(--gy-heat-poor)]"
  if (zscore <= 1.5) return "bg-[var(--gy-heat-poor)]"
  return "bg-[var(--gy-heat-worst)]"
}

export function getDiscountColor(discount: number): string {
  if (discount <= -15) return "bg-[var(--gy-heat-best)]"
  if (discount <= -10) return "bg-[var(--gy-heat-good)]"
  if (discount <= -7) return "bg-[var(--gy-heat-mid-good)]"
  if (discount <= -4) return "bg-[var(--gy-heat-mid)]"
  if (discount <= 0) return "bg-[var(--gy-heat-mid-warm)]"
  return "bg-[var(--gy-heat-poor)]"
}

export function getDistRateColor(rate: number): string {
  if (rate >= 14) return "bg-[var(--gy-heat-best)]"
  if (rate >= 12) return "bg-[var(--gy-heat-good)]"
  if (rate >= 10) return "bg-[var(--gy-heat-mid-good)]"
  if (rate >= 8) return "bg-[var(--gy-heat-mid)]"
  if (rate >= 6) return "bg-[var(--gy-heat-mid-warm)]"
  return "bg-[var(--gy-heat-poor)]"
}

export function getTrendColor(score: number): string {
  if (score >= 80) return "bg-[var(--gy-heat-best)]"
  if (score >= 65) return "bg-[var(--gy-heat-good)]"
  if (score >= 50) return "bg-[var(--gy-heat-mid-good)]"
  if (score >= 35) return "bg-[var(--gy-heat-mid)]"
  if (score >= 20) return "bg-[var(--gy-heat-mid-warm)]"
  return "bg-[var(--gy-heat-poor)]"
}

export function getTechnicalColor(score: number): string {
  return getTrendColor(score)
}

export function getRankColor(score: number): string {
  if (score >= 80) return "bg-[var(--gy-heat-best)]"
  if (score >= 65) return "bg-[var(--gy-heat-good)]"
  if (score >= 50) return "bg-[var(--gy-heat-mid-good)]"
  if (score >= 35) return "bg-[var(--gy-heat-mid)]"
  if (score >= 20) return "bg-[var(--gy-heat-mid-warm)]"
  return "bg-[var(--gy-heat-poor)]"
}

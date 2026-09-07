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
  /** Borrowing as % of assets; null when the fund does not report it */
  leverage: number | null
  trend: number // momentum score 0-100 (higher = stronger buy signal)
  /** Composite technical buy rating 0-100; null when not computable */
  technical_rating: number | null
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

/**
 * Percentile-rank a series, 100 = best. Ties share the average of the ranks
 * they span, so a pillar where every fund scores the same contributes an even
 * 50 to all of them instead of an arbitrary 0-100 spread by array order.
 */
function percentileRanks(values: number[], direction: "asc" | "desc"): number[] {
  const n = values.length
  if (n <= 1) return values.map(() => 100)
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => (direction === "asc" ? a.v - b.v : b.v - a.v))
  const ranks = new Array<number>(n)
  for (let start = 0; start < n; ) {
    let end = start
    while (end + 1 < n && indexed[end + 1].v === indexed[start].v) end++
    const shared = ((n - 1 - start) + (n - 1 - end)) / 2
    const score = Math.round((shared / (n - 1)) * 100)
    for (let k = start; k <= end; k++) ranks[indexed[k].i] = score
    start = end + 1
  }
  return ranks
}

/**
 * Composite rank across the watchlist universe:
 * 40% Z-score (longest available) + 20% yield + 20% technical + 20% discount.
 * Each pillar is percentile-ranked within the provided universe. Funds with no
 * technical reading are ranked on the remaining pillars, reweighted to 100%,
 * rather than being handed a made-up middling score.
 */
export function computeRank(data: CEFData[]): Map<string, number> {
  const zRanks = percentileRanks(data.map((d) => getEffectiveZScore(d)), "asc")
  const yRanks = percentileRanks(data.map((d) => d.distribution_rate), "desc")
  const dRanks = percentileRanks(data.map((d) => d.discount), "asc")

  const withTechnical = data.filter((d) => d.technical_rating !== null)
  const technicalRanks = percentileRanks(
    withTechnical.map((d) => d.technical_rating as number),
    "desc",
  )
  const tRankBySymbol = new Map<string, number>()
  withTechnical.forEach((fund, i) => tRankBySymbol.set(fund.symbol, technicalRanks[i]))

  const rankMap = new Map<string, number>()
  data.forEach((fund, i) => {
    const pillars: { rank: number; weight: number }[] = [
      { rank: zRanks[i], weight: 0.4 },
      { rank: yRanks[i], weight: 0.2 },
      { rank: dRanks[i], weight: 0.2 },
    ]
    const tRank = tRankBySymbol.get(fund.symbol)
    if (tRank !== undefined) pillars.push({ rank: tRank, weight: 0.2 })

    const totalWeight = pillars.reduce((s, p) => s + p.weight, 0)
    const weighted = pillars.reduce((s, p) => s + p.rank * p.weight, 0)
    rankMap.set(fund.symbol, Math.round(weighted / totalWeight))
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
    if (metric === "technical")
      return (b.technical_rating ?? -1) - (a.technical_rating ?? -1)
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

/** Neutral slate for metrics with no reading, so "no data" never reads as a score. */
export const NO_DATA_COLOR = "bg-[var(--gy-heat-none)]"

export function getTechnicalColor(score: number | null): string {
  if (score === null) return NO_DATA_COLOR
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

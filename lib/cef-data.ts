export interface CEFData {
  symbol: string
  name: string
  price: number
  nav: number
  discount: number
  zscore_1y: number
  zscore_3y: number | null
  zscore_5y: number | null
  distribution_rate: number
  leverage: number
  trend: number // momentum score 0-100 (higher = stronger buy signal)
  volume: number
}

// Realistic sample data modeled on common CEFs
export const cefData: CEFData[] = [
  { symbol: "PDI", name: "PIMCO Dynamic Income", price: 18.52, nav: 20.14, discount: -8.04, zscore_1y: -2.31, zscore_3y: -1.85, zscore_5y: -1.42, distribution_rate: 14.2, leverage: 42.3, trend: 82, volume: 2340000 },
  { symbol: "PTY", name: "PIMCO Corporate & Income Opp", price: 13.18, nav: 14.76, discount: -10.7, zscore_1y: -1.98, zscore_3y: -1.62, zscore_5y: -1.21, distribution_rate: 11.8, leverage: 38.1, trend: 74, volume: 1120000 },
  { symbol: "GOF", name: "Guggenheim Strategic Opps", price: 14.05, nav: 16.92, discount: -16.96, zscore_1y: -2.54, zscore_3y: -2.1, zscore_5y: -1.73, distribution_rate: 15.3, leverage: 29.7, trend: 91, volume: 890000 },
  { symbol: "UTF", name: "Cohen & Steers Infra", price: 23.41, nav: 25.87, discount: -9.51, zscore_1y: -1.42, zscore_3y: -0.98, zscore_5y: -0.67, distribution_rate: 7.9, leverage: 25.4, trend: 48, volume: 456000 },
  { symbol: "RQI", name: "Cohen & Steers Quality Realty", price: 11.83, nav: 13.21, discount: -10.45, zscore_1y: -1.67, zscore_3y: -1.33, zscore_5y: -0.91, distribution_rate: 8.4, leverage: 22.1, trend: 56, volume: 678000 },
  { symbol: "EOS", name: "Eaton Vance Enhanced Equity", price: 22.15, nav: 23.48, discount: -5.66, zscore_1y: 0.34, zscore_3y: 0.12, zscore_5y: null, distribution_rate: 8.1, leverage: 0, trend: 29, volume: 234000 },
  { symbol: "BST", name: "BlackRock Science & Tech", price: 35.62, nav: 38.95, discount: -8.55, zscore_1y: -0.87, zscore_3y: -0.45, zscore_5y: -0.22, distribution_rate: 9.3, leverage: 0, trend: 43, volume: 345000 },
  { symbol: "BIGZ", name: "BlackRock Innovation & Growth", price: 7.15, nav: 8.92, discount: -19.84, zscore_1y: -2.88, zscore_3y: -2.45, zscore_5y: null, distribution_rate: 12.7, leverage: 0, trend: 95, volume: 1560000 },
  { symbol: "THQ", name: "Tekla Healthcare Opps", price: 17.88, nav: 19.56, discount: -8.59, zscore_1y: -0.56, zscore_3y: -0.23, zscore_5y: 0.11, distribution_rate: 9.8, leverage: 15.2, trend: 38, volume: 189000 },
  { symbol: "USA", name: "Liberty All-Star Equity", price: 6.42, nav: 7.38, discount: -13.01, zscore_1y: -1.12, zscore_3y: -0.78, zscore_5y: -0.56, distribution_rate: 10.2, leverage: 0, trend: 62, volume: 567000 },
  { symbol: "AWF", name: "AllianceBernstein Global HiInc", price: 10.15, nav: 11.34, discount: -10.49, zscore_1y: -1.78, zscore_3y: -1.45, zscore_5y: -1.12, distribution_rate: 8.6, leverage: 18.3, trend: 67, volume: 432000 },
  { symbol: "HIO", name: "Western Asset HiInc Opp", price: 4.12, nav: 4.78, discount: -13.81, zscore_1y: -2.12, zscore_3y: -1.88, zscore_5y: -1.56, distribution_rate: 11.4, leverage: 33.2, trend: 78, volume: 876000 },
  { symbol: "HYT", name: "BlackRock Corp High Yield", price: 9.45, nav: 10.67, discount: -11.43, zscore_1y: -1.34, zscore_3y: -1.01, zscore_5y: -0.78, distribution_rate: 9.7, leverage: 28.9, trend: 55, volume: 654000 },
  { symbol: "DNP", name: "Duff & Phelps Utility & Infra", price: 10.78, nav: 10.21, discount: 5.58, zscore_1y: 1.23, zscore_3y: 1.56, zscore_5y: 1.89, distribution_rate: 7.1, leverage: 20.4, trend: 15, volume: 298000 },
  { symbol: "JPC", name: "Nuveen Preferred & Income Opp", price: 8.34, nav: 9.15, discount: -8.85, zscore_1y: -0.92, zscore_3y: -0.67, zscore_5y: -0.34, distribution_rate: 8.9, leverage: 35.6, trend: 41, volume: 412000 },
  { symbol: "NVG", name: "Nuveen AMT-Free Muni Credit", price: 12.56, nav: 13.89, discount: -9.58, zscore_1y: -1.56, zscore_3y: -1.23, zscore_5y: -0.89, distribution_rate: 5.8, leverage: 38.7, trend: 58, volume: 523000 },
  { symbol: "NAD", name: "Nuveen Quality Muni Income", price: 11.92, nav: 13.45, discount: -11.38, zscore_1y: -1.89, zscore_3y: -1.56, zscore_5y: -1.23, distribution_rate: 5.4, leverage: 40.1, trend: 64, volume: 389000 },
  { symbol: "CII", name: "BlackRock Enhanced Capital", price: 19.34, nav: 20.12, discount: -3.88, zscore_1y: 0.67, zscore_3y: 0.45, zscore_5y: 0.23, distribution_rate: 6.2, leverage: 0, trend: 22, volume: 178000 },
  { symbol: "ETG", name: "Eaton Vance Tax-Adv Global Div", price: 16.78, nav: 18.34, discount: -8.51, zscore_1y: -0.78, zscore_3y: -0.45, zscore_5y: -0.12, distribution_rate: 8.5, leverage: 21.8, trend: 45, volume: 267000 },
  { symbol: "PCI", name: "PIMCO Dynamic Credit & Mort", price: 16.92, nav: 19.45, discount: -13.01, zscore_1y: -2.01, zscore_3y: -1.67, zscore_5y: -1.34, distribution_rate: 12.1, leverage: 45.2, trend: 85, volume: 987000 },
]

export type SortMetric = "rank" | "zscore_1y" | "discount" | "distribution_rate" | "trend"

// Compute percentile rank (0-100) for an array of values
// direction: "asc" = lower raw value is better, "desc" = higher raw value is better
function percentileRanks(values: number[], direction: "asc" | "desc"): number[] {
  const n = values.length
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => direction === "asc" ? a.v - b.v : b.v - a.v)
  const ranks = new Array<number>(n)
  indexed.forEach((item, rank) => {
    // rank 0 = best = score 100, rank n-1 = worst = score ~0
    ranks[item.i] = Math.round(((n - 1 - rank) / (n - 1)) * 100)
  })
  return ranks
}

// 5-Pillar Composite Score (RANK*)
// Yield Quality 25% + Discount Attractiveness 25% + X-Ray (Z-Score) 20% + Risk & Liquidity 15% + Momentum & Regime 15%
export function computeRank(data: CEFData[]): Map<string, number> {
  const yRanks = percentileRanks(data.map((d) => d.distribution_rate), "desc") // highest yield = best
  const dRanks = percentileRanks(data.map((d) => d.discount), "asc") // deepest discount = best
  const zRanks = percentileRanks(data.map((d) => d.zscore_1y), "asc") // most negative = best
  // Risk: lower leverage = better (less risk)
  const rRanks = percentileRanks(data.map((d) => d.leverage), "asc") // lowest leverage = best
  const tRanks = percentileRanks(data.map((d) => d.trend), "desc") // highest trend = best

  const rankMap = new Map<string, number>()
  data.forEach((fund, i) => {
    const score = Math.round(
      yRanks[i] * 0.25 +
      dRanks[i] * 0.25 +
      zRanks[i] * 0.20 +
      rRanks[i] * 0.15 +
      tRanks[i] * 0.15
    )
    rankMap.set(fund.symbol, score)
  })
  return rankMap
}

export function getTopFunds(data: CEFData[], metric: SortMetric, count: number): CEFData[] {
  if (metric === "rank") {
    const rankMap = computeRank(data)
    const sorted = [...data].sort((a, b) => (rankMap.get(b.symbol) ?? 0) - (rankMap.get(a.symbol) ?? 0))
    return sorted.slice(0, count)
  }

  const sorted = [...data].sort((a, b) => {
    if (metric === "zscore_1y") return a.zscore_1y - b.zscore_1y
    if (metric === "discount") return a.discount - b.discount
    if (metric === "distribution_rate") return b.distribution_rate - a.distribution_rate
    if (metric === "trend") return b.trend - a.trend
    return 0
  })
  return sorted.slice(0, count)
}

export function getZScoreColor(zscore: number): string {
  // Most negative Z-score = best value = green (#228844)
  if (zscore <= -2.5) return "bg-[#228844]"
  if (zscore <= -2.0) return "bg-[#3a8f4a]"
  if (zscore <= -1.5) return "bg-[#6ea832]"
  if (zscore <= -1.0) return "bg-[#c4a41a]"
  if (zscore <= -0.5) return "bg-[#ffb100]"
  if (zscore <= 0.5) return "bg-[#d48a10]"
  if (zscore <= 1.0) return "bg-[#c06018]"
  if (zscore <= 1.5) return "bg-[#b02020]"
  return "bg-[#8a1818]"
}

export function getZScoreTextColor(zscore: number): string {
  if (zscore <= -2.5) return "text-[#6edd8a]"
  if (zscore <= -2.0) return "text-[#6edd8a]"
  if (zscore <= -1.5) return "text-[#a8e06a]"
  if (zscore <= -1.0) return "text-[#ffe066]"
  if (zscore <= -0.5) return "text-[#ffc94d]"
  if (zscore <= 0.5) return "text-[#ffb100]"
  if (zscore <= 1.0) return "text-[#e08050]"
  if (zscore <= 1.5) return "text-[#e06060]"
  return "text-[#e06060]"
}

export function getDiscountColor(discount: number): string {
  // Deepest discount = best value = green
  if (discount <= -15) return "bg-[#228844]"
  if (discount <= -10) return "bg-[#3a8f4a]"
  if (discount <= -7) return "bg-[#6ea832]"
  if (discount <= -4) return "bg-[#ffb100]"
  if (discount <= 0) return "bg-[#d48a10]"
  return "bg-[#b02020]" // premium = worst
}

export function getDistRateColor(rate: number): string {
  // Highest yield = best = green
  if (rate >= 14) return "bg-[#228844]"
  if (rate >= 12) return "bg-[#3a8f4a]"
  if (rate >= 10) return "bg-[#6ea832]"
  if (rate >= 8) return "bg-[#ffb100]"
  if (rate >= 6) return "bg-[#d48a10]"
  return "bg-[#b02020]"
}

export function getTrendColor(score: number): string {
  // Highest momentum score = best = green
  if (score >= 80) return "bg-[#228844]"
  if (score >= 65) return "bg-[#3a8f4a]"
  if (score >= 50) return "bg-[#6ea832]"
  if (score >= 35) return "bg-[#ffb100]"
  if (score >= 20) return "bg-[#d48a10]"
  return "bg-[#b02020]"
}

export function getRankColor(score: number): string {
  if (score >= 80) return "bg-[#228844]"
  if (score >= 65) return "bg-[#3a8f4a]"
  if (score >= 50) return "bg-[#6ea832]"
  if (score >= 35) return "bg-[#ffb100]"
  if (score >= 20) return "bg-[#d48a10]"
  return "bg-[#b02020]"
}

export function getIntensity(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return (value - min) / (max - min)
}

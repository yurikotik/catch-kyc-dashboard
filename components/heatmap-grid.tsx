"use client"

import type { CEFData, SortMetric } from "@/lib/cef-data"
import { getTopFunds, computeRank } from "@/lib/cef-data"
import { HeatmapCell } from "./heatmap-cell"

interface HeatmapGridProps {
  data: CEFData[]
  metric: SortMetric
  count: 20
}

export function HeatmapGrid({ data, metric, count }: HeatmapGridProps) {
  const funds = getTopFunds(data, metric, count)
  const rankMap = computeRank(data)

  // Rank-forward card stack: 1 col phone → 2 tablet → 3–4 desktop
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Top 20 funds"
    >
      {funds.map((fund, index) => (
        <div key={fund.symbol} role="listitem">
          <HeatmapCell
            fund={fund}
            metric={metric}
            rank={index + 1}
            rankScore={rankMap.get(fund.symbol)}
          />
        </div>
      ))}
    </div>
  )
}

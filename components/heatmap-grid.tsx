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

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {funds.map((fund, index) => (
        <HeatmapCell
          key={fund.symbol}
          fund={fund}
          metric={metric}
          size="sm"
          rank={index + 1}
          rankScore={rankMap.get(fund.symbol)}
        />
      ))}
    </div>
  )
}

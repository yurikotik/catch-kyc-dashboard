"use client"

import { useState } from "react"
import type { CEFData, SortMetric } from "@/lib/cef-data"
import {
  getZScoreColor,
  getDiscountColor,
  getDistRateColor,
  getTrendColor,
  getRankColor,
  getTechnicalColor,
  getEffectiveZScore,
} from "@/lib/cef-data"

function getColorForMetric(fund: CEFData, metric: SortMetric, rankScore?: number): string {
  switch (metric) {
    case "rank":
      return getRankColor(rankScore ?? 0)
    case "zscore":
    case "zscore_1y":
      return getZScoreColor(getEffectiveZScore(fund))
    case "discount":
      return getDiscountColor(fund.discount)
    case "distribution_rate":
      return getDistRateColor(fund.distribution_rate)
    case "trend":
      return getTrendColor(fund.trend)
    case "technical":
      return getTechnicalColor(fund.technical_rating)
  }
}

function getValueForMetric(fund: CEFData, metric: SortMetric, rankScore?: number): string {
  switch (metric) {
    case "rank":
      return `${rankScore ?? 0}`
    case "zscore":
    case "zscore_1y":
      return getEffectiveZScore(fund).toFixed(2)
    case "discount":
      return `${fund.discount.toFixed(1)}%`
    case "distribution_rate":
      return `${fund.distribution_rate.toFixed(1)}%`
    case "trend":
      return `${fund.trend}`
    case "technical":
      return `${fund.technical_rating}`
  }
}

function getMetricLabel(metric: SortMetric, fund?: CEFData): string {
  switch (metric) {
    case "rank":
      return "RANK*"
    case "zscore":
      return fund ? `Z-Score ${fund.zscore_window}` : "Z-Score"
    case "zscore_1y":
      return "Z-Score 1Y"
    case "discount":
      return "Discount"
    case "distribution_rate":
      return "Current Yield"
    case "trend":
      return "Trend"
    case "technical":
      return "Technical"
  }
}

interface HeatmapCellProps {
  fund: CEFData
  metric: SortMetric
  size: "sm" | "md" | "lg"
  rank: number
  rankScore?: number
}

export function HeatmapCell({ fund, metric, size, rank, rankScore }: HeatmapCellProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const colorClass = getColorForMetric(fund, metric, rankScore)
  const value = getValueForMetric(fund, metric, rankScore)

  const sizeClasses = {
    sm: "min-h-14 lg:min-h-0 lg:h-full",
    md: "min-h-20 lg:min-h-0 lg:h-full",
    lg: "min-h-24 lg:min-h-0 lg:h-full",
  }

  return (
    <div className="relative h-full min-h-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${colorClass} ${sizeClasses[size]} w-full rounded-lg p-1.5 sm:p-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 cursor-pointer border border-white/10`}
        aria-label={`${fund.symbol}: ${getMetricLabel(metric, fund)} ${value}`}
        aria-expanded={isExpanded}
      >
        <span className="absolute top-1 left-1.5 text-[9px] font-mono text-white/50">
          {rank}
        </span>
        <span className="text-sm font-bold text-white tracking-wide">
          {fund.symbol}
        </span>
        <span className="text-xs font-mono text-white/90">{value}</span>
      </button>

      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/60"
            onClick={() => setIsExpanded(false)}
          />
          {/* Card Detail */}
          <div className="fixed z-40 left-4 right-4 top-1/2 -translate-y-1/2 bg-card border border-[#003377]/60 rounded-xl shadow-2xl shadow-[#003377]/30 overflow-hidden max-w-sm mx-auto">
            {/* Header bar with rank color */}
            <div className={`${getColorForMetric(fund, "rank", rankScore)} px-4 py-3 flex items-center justify-between`}>
              <div>
                <h4 className="text-lg font-bold text-white">{fund.symbol}</h4>
                <p className="text-[11px] text-white/80 leading-tight">{fund.name}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] text-white/60 uppercase tracking-wider">RANK*</span>
                <span className="text-xl font-bold text-white font-mono">{rankScore ?? "--"}</span>
              </div>
            </div>

            {/* Essential data */}
            <div className="p-4">
              {/* Price & NAV row */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1 bg-[#003377]/25 rounded-lg p-2.5 text-center border border-[#003377]/30">
                  <span className="block text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Price</span>
                  <span className="text-base font-bold font-mono text-white">${fund.price.toFixed(2)}</span>
                </div>
                <div className="flex-1 bg-[#003377]/25 rounded-lg p-2.5 text-center border border-[#003377]/30">
                  <span className="block text-[10px] text-white/50 uppercase tracking-wider mb-0.5">NAV</span>
                  <span className="text-base font-bold font-mono text-white">${fund.nav.toFixed(2)}</span>
                </div>
                <div className="flex-1 bg-[#003377]/25 rounded-lg p-2.5 text-center border border-[#003377]/30">
                  <span className="block text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Discount</span>
                  <span className={`text-base font-bold font-mono ${fund.discount < 0 ? "text-[#228844]" : "text-[#b02020]"}`}>
                    {fund.discount.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* 5 Pillars */}
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                <PillarMini label="Yield" value={`${fund.distribution_rate.toFixed(1)}%`} color="text-[#ffb100]" />
                <PillarMini label="Disc" value={`${fund.discount.toFixed(1)}%`} color={fund.discount < 0 ? "text-[#228844]" : "text-[#b02020]"} />
                <PillarMini label="Z-Score" value={`${getEffectiveZScore(fund).toFixed(2)}`} color={getEffectiveZScore(fund) < 0 ? "text-[#228844]" : "text-[#b02020]"} />
                <PillarMini label="Tech" value={`${fund.technical_rating}`} color={fund.technical_rating >= 65 ? "text-[#228844]" : fund.technical_rating >= 35 ? "text-[#ffb100]" : "text-[#b02020]"} />
                <PillarMini label="Risk" value={`${fund.leverage.toFixed(0)}%`} color={fund.leverage < 25 ? "text-[#228844]" : fund.leverage < 35 ? "text-[#ffb100]" : "text-[#b02020]"} />
                <PillarMini label="Trend" value={`${fund.trend}`} color={fund.trend >= 65 ? "text-[#228844]" : fund.trend >= 35 ? "text-[#ffb100]" : "text-[#b02020]"} />
              </div>

              {/* Z-Score breakdown */}
              <div className="bg-[#003377]/20 rounded-lg p-2.5 mb-3 border border-[#003377]/30">
                <span className="text-[10px] text-white/50 uppercase tracking-wider">Z-Score Breakdown</span>
                <div className="flex gap-4 mt-1.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground">1Y</span>
                    <span className={`block text-sm font-bold font-mono ${fund.zscore_1y < 0 ? "text-[#228844]" : "text-[#b02020]"}`}>
                      {fund.zscore_1y.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">3Y</span>
                    <span className={`block text-sm font-bold font-mono ${fund.zscore_3y !== null && fund.zscore_3y < 0 ? "text-[#228844]" : fund.zscore_3y !== null ? "text-[#b02020]" : "text-muted-foreground"}`}>
                      {fund.zscore_3y !== null ? fund.zscore_3y.toFixed(2) : "n/a"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">5Y</span>
                    <span className={`block text-sm font-bold font-mono ${fund.zscore_5y !== null && fund.zscore_5y < 0 ? "text-[#228844]" : fund.zscore_5y !== null ? "text-[#b02020]" : "text-muted-foreground"}`}>
                      {fund.zscore_5y !== null ? fund.zscore_5y.toFixed(2) : "n/a"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                <span>Technical ({fund.technical_signal ?? "n/a"})</span>
                <span className="font-mono text-foreground">{fund.technical_rating}</span>
              </div>

              {/* Volume */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Volume</span>
                <span className="font-mono text-foreground">{fund.volume.toLocaleString()}</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full py-3 border-t border-[#003377]/40 text-sm font-medium text-white/50 hover:text-white hover:bg-[#003377]/30 transition-colors"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function PillarMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#003377]/25 rounded-md p-1.5 text-center border border-[#003377]/30">
      <span className="block text-[8px] text-white/50 uppercase tracking-wider leading-tight">{label}</span>
      <span className={`block text-[11px] font-bold font-mono leading-tight mt-0.5 ${color}`}>{value}</span>
    </div>
  )
}

"use client"

import { useState } from "react"
import { cefData, type SortMetric } from "@/lib/cef-data"
import { HeatmapGrid } from "./heatmap-grid"
import { HeatmapLegend } from "./heatmap-legend"

const pillarMetrics: { value: SortMetric; label: string; description: string }[] = [
  { value: "zscore_1y", label: "Z-Score", description: "1-Year Z-Score" },
  { value: "discount", label: "Discount", description: "NAV Discount" },
  { value: "distribution_rate", label: "Yield", description: "Distribution Rate" },
  { value: "trend", label: "Trend", description: "Momentum Score" },
]

const allMetrics = [
  ...pillarMetrics,
  { value: "rank" as SortMetric, label: "RANK*", description: "5-Pillar Composite" },
]

export function CEFDashboard() {
  const [activeMetric, setActiveMetric] = useState<SortMetric>("rank")

  const currentMetric = allMetrics.find((m) => m.value === activeMetric)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#003377] border-b border-[#004499]/50 shadow-lg shadow-[#003377]/30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                TOP DOGS <span className="text-[#ffb100]">20/20</span> PLAY DECK
              </h1>
              <p className="text-[11px] text-[#ffb100]/70 font-mono">
                TOP 50 CEF INDEX DAILY DATA & RANK
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#228844] animate-pulse" />
              <span className="text-[11px] text-white/60 font-mono">
                Live
              </span>
            </div>
          </div>

          {/* Metric Selector */}
          <div className="flex gap-1.5 mb-3 items-center">
            <div className="flex gap-1 flex-1">
              {pillarMetrics.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setActiveMetric(m.value)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    activeMetric === m.value
                      ? "bg-white text-[#003377] font-bold"
                      : "bg-[#002255] text-white/70 hover:bg-[#004499] hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="w-px h-7 bg-white/20" />
            <button
              onClick={() => setActiveMetric("rank")}
              className={`py-2 px-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeMetric === "rank"
                  ? "bg-[#ffb100] text-[#003377]"
                  : "bg-[#002255] text-[#ffb100] border border-[#ffb100]/40 hover:bg-[#ffb100]/15"
              }`}
            >
              RANK*
            </button>
          </div>


        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Ranked by {currentMetric?.description}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tap any card for details
            </p>
          </div>
        </div>

        {/* Heatmap */}
        <HeatmapGrid
          data={cefData}
          metric={activeMetric}
          count={20}
        />

        {/* Legend */}
        <div className="mt-4 p-3 bg-[#003377]/30 rounded-lg border border-[#003377]/50">
          <p className="text-[10px] text-[#ffb100]/70 mb-2 font-medium uppercase tracking-wider">
            Color Legend
          </p>
          <HeatmapLegend metric={activeMetric} />
        </div>

        {/* Stats Summary */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatCard
            label="Avg Discount"
            value={`${(cefData.reduce((s, f) => s + f.discount, 0) / cefData.length).toFixed(1)}%`}
            color="text-[#228844]"
          />
          <StatCard
            label="Avg Yield"
            value={`${(cefData.reduce((s, f) => s + f.distribution_rate, 0) / cefData.length).toFixed(1)}%`}
            color="text-[#ffb100]"
          />
          <StatCard
            label="Avg Z-Score"
            value={(cefData.reduce((s, f) => s + f.zscore_1y, 0) / cefData.length).toFixed(2)}
            color="text-[#228844]"
          />
        </div>

        {/* TOP 50 INDEX DATA SET Button */}
        <div className="mt-6 mb-2">
          <button
            className="w-full relative overflow-hidden rounded-xl bg-[#003377] py-6 px-6 text-center transition-all active:scale-[0.97] hover:bg-[#004499] border-2 border-[#004499] shadow-xl shadow-[#003377]/40"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <span className="relative block text-2xl font-black tracking-widest text-[#ffb100] drop-shadow-lg">
              TOP 50 INDEX DATA SET
            </span>
            <span className="relative block text-[11px] text-white/50 font-mono mt-2 tracking-wide">
              Full universe with 5-pillar analytics
            </span>
            <div className="absolute top-2 right-3 text-[#ffb100]/40 text-2xl font-bold">&rarr;</div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 border-t border-[#003377]/40 bg-[#003377]/10">
        <p className="text-[10px] text-muted-foreground text-center font-mono">
          Data sourced from CEF Connect & Barchart
        </p>
        <p className="text-[9px] text-muted-foreground text-center font-mono mt-1">
          RANK* = 5-Pillar Composite: Yield 25% + Discount 25% + X-Ray 20% + Risk 15% + Momentum 15%
        </p>
      </footer>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-[#003377]/20 rounded-lg border border-[#003377]/40 p-3 flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className={`text-base font-bold font-mono ${color}`}>
        {value}
      </span>
    </div>
  )
}

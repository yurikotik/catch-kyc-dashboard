"use client"

import { useEffect, useId, useRef, useState } from "react"
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

/** Yellow / lime / gold bands need dark ink; green / orange / red use white */
function needsDarkInk(fund: CEFData, metric: SortMetric, rankScore?: number): boolean {
  const score =
    metric === "rank"
      ? (rankScore ?? 0)
      : metric === "zscore" || metric === "zscore_1y"
        ? getEffectiveZScore(fund)
        : metric === "discount"
          ? fund.discount
          : metric === "distribution_rate"
            ? fund.distribution_rate
            : metric === "trend"
              ? fund.trend
              : fund.technical_rating

  if (metric === "rank" || metric === "trend" || metric === "technical") {
    return score >= 20 && score < 65
  }
  if (metric === "zscore" || metric === "zscore_1y") {
    return score > -2.0 && score <= 0.5
  }
  if (metric === "discount") {
    return score > -10 && score <= 0
  }
  if (metric === "distribution_rate") {
    return score >= 6 && score < 12
  }
  return false
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
      return "Income rate"
    case "trend":
      return "Trend"
    case "technical":
      return "Technical"
  }
}

interface HeatmapCellProps {
  fund: CEFData
  metric: SortMetric
  rank: number
  rankScore?: number
}

export function HeatmapCell({ fund, metric, rank, rankScore }: HeatmapCellProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const heatBg = getColorForMetric(fund, metric, rankScore)
  const value = getValueForMetric(fund, metric, rankScore)
  const darkInk = needsDarkInk(fund, metric, rankScore)
  const fg = darkInk ? "text-[var(--gy-ink)]" : "text-white"
  const fgMuted = darkInk ? "text-[var(--gy-ink)]/75" : "text-white/85"
  const fgSoft = darkInk ? "bg-[var(--gy-ink)]/10" : "bg-white/15"
  const borderTone = darkInk ? "border-black/10" : "border-white/20"

  useEffect(() => {
    if (!isExpanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false)
    }
    window.addEventListener("keydown", onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [isExpanded])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={`gy-tap flex min-h-[5.5rem] w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left shadow-[var(--page-shadow)] transition-opacity hover:opacity-95 ${heatBg} ${fg} ${borderTone}`}
        aria-label={`Rank ${rank}. ${fund.symbol}: ${getMetricLabel(metric, fund)} ${value}. Open details.`}
        aria-expanded={isExpanded}
        aria-haspopup="dialog"
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[length:var(--gy-text-sm)] font-semibold ${fgMuted}`}>#{rank}</p>
          <p className="truncate text-[length:var(--gy-text-lg)] font-bold leading-tight">
            {fund.symbol}
          </p>
          <p className={`mt-0.5 truncate text-[length:var(--gy-text-sm)] ${fgMuted}`}>
            {getMetricLabel(metric, fund)}
          </p>
        </div>
        <div className={`shrink-0 rounded-lg px-3 py-2 text-center ${fgSoft}`}>
          <p className="text-[length:var(--gy-text-xl)] font-bold leading-none tabular-nums">
            {value}
          </p>
        </div>
        <span className={`shrink-0 text-[length:var(--gy-text-lg)] font-bold ${fgMuted}`} aria-hidden>
          →
        </span>
      </button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ background: "var(--page-overlay)" }}
            onClick={() => setIsExpanded(false)}
            aria-hidden
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed left-4 right-4 top-1/2 z-40 mx-auto flex max-h-[85vh] w-auto max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[var(--page-border)] bg-[var(--page-surface)] shadow-[var(--page-shadow)] outline-none"
          >
            {/* Heat header — full-bleed, no task-card padding clash */}
            <div className={`${heatBg} ${fg} px-5 py-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className={`text-[length:var(--gy-text-sm)] font-semibold ${fgMuted}`}>
                    Rank #{rank}
                  </p>
                  <h4
                    id={titleId}
                    className="mt-1 text-[length:var(--gy-text-2xl)] font-bold leading-tight"
                  >
                    {fund.symbol}
                  </h4>
                  <p className={`mt-2 text-[length:var(--gy-text-base)] leading-snug ${fgMuted}`}>
                    {fund.name}
                  </p>
                </div>
                <div className={`shrink-0 rounded-lg px-3 py-2.5 text-right ${fgSoft}`}>
                  <p className={`text-[length:var(--gy-text-sm)] font-medium ${fgMuted}`}>
                    {getMetricLabel(metric, fund)}
                  </p>
                  <p className="text-[length:var(--gy-text-xl)] font-bold tabular-nums leading-tight">
                    {value}
                  </p>
                </div>
              </div>
              {metric !== "rank" && rankScore != null && (
                <p className={`mt-4 text-[length:var(--gy-text-sm)] font-semibold ${fgMuted}`}>
                  RANK* score:{" "}
                  <span className={`text-[length:var(--gy-text-lg)] font-bold ${fg}`}>
                    {rankScore}
                  </span>
                </p>
              )}
            </div>

            <div className="overflow-y-auto p-5">
              <div className="mb-4 grid grid-cols-3 gap-2">
                <MetricBox label="Price" value={`$${fund.price.toFixed(2)}`} />
                <MetricBox label="NAV" value={`$${fund.nav.toFixed(2)}`} />
                <MetricBox
                  label="Discount"
                  value={`${fund.discount.toFixed(1)}%`}
                  tone={fund.discount < 0 ? "success" : "danger"}
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricBox
                  label="Income rate"
                  value={`${fund.distribution_rate.toFixed(1)}%`}
                  tone="gold"
                />
                <MetricBox
                  label={`Z-Score (${fund.zscore_window})`}
                  value={getEffectiveZScore(fund).toFixed(2)}
                  tone={getEffectiveZScore(fund) < 0 ? "success" : "danger"}
                />
                <MetricBox
                  label="Technical"
                  value={`${fund.technical_rating}`}
                  tone={
                    fund.technical_rating >= 65
                      ? "success"
                      : fund.technical_rating >= 35
                        ? "gold"
                        : "danger"
                  }
                />
                <MetricBox
                  label="Trend"
                  value={`${fund.trend}`}
                  tone={fund.trend >= 65 ? "success" : fund.trend >= 35 ? "gold" : "danger"}
                />
                <MetricBox
                  label="Borrowing"
                  value={`${fund.leverage.toFixed(0)}%`}
                  tone={fund.leverage < 25 ? "success" : fund.leverage < 35 ? "gold" : "danger"}
                />
                <MetricBox label="Volume" value={fund.volume.toLocaleString()} />
              </div>

              <div className="rounded-xl border border-[var(--page-border)] bg-[var(--page-surface-2)] p-3">
                <p className="mb-2 text-[length:var(--gy-text-sm)] font-semibold text-[var(--page-muted)]">
                  Z-Score breakdown
                </p>
                <div className="flex gap-6">
                  <ZYear label="1Y" value={fund.zscore_1y} />
                  <ZYear label="3Y" value={fund.zscore_3y} />
                  <ZYear label="5Y" value={fund.zscore_5y} />
                </div>
              </div>

              <p className="mt-3 text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
                Technical signal:{" "}
                <span className="font-semibold text-[var(--page-text)]">
                  {fund.technical_signal ?? "n/a"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="gy-tap min-h-12 w-full shrink-0 border-t border-[var(--page-border)] bg-[var(--page-surface)] text-[length:var(--gy-text-base)] font-semibold text-[var(--page-text)] hover:bg-[var(--page-surface-2)]"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "danger" | "gold"
}) {
  const valueClass =
    tone === "success"
      ? "text-[var(--gy-success)]"
      : tone === "danger"
        ? "text-[var(--gy-danger)]"
        : tone === "gold"
          ? "text-[var(--gy-gold)]"
          : "text-[var(--page-text)]"

  return (
    <div className="rounded-lg border border-[var(--page-border)] bg-[var(--page-surface)] p-3 text-center">
      <span className="block text-[length:var(--gy-text-sm)] leading-tight text-[var(--page-muted)]">
        {label}
      </span>
      <span
        className={`mt-1 block text-[length:var(--gy-text-base)] font-bold leading-tight ${valueClass}`}
      >
        {value}
      </span>
    </div>
  )
}

function ZYear({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null
      ? "text-[var(--page-muted)]"
      : value < 0
        ? "text-[var(--gy-success)]"
        : "text-[var(--gy-danger)]"

  return (
    <div>
      <span className="block text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">{label}</span>
      <span className={`block text-[length:var(--gy-text-base)] font-bold ${tone}`}>
        {value !== null ? value.toFixed(2) : "n/a"}
      </span>
    </div>
  )
}

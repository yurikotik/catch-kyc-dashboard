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

/** Bright yellow mid-scores need dark ink for contrast */
function chipNeedsDarkInk(fund: CEFData, metric: SortMetric, rankScore?: number): boolean {
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
    return score >= 20 && score < 50
  }
  if (metric === "zscore" || metric === "zscore_1y") {
    return score > -1.5 && score <= 0.5
  }
  if (metric === "discount") {
    return score > -10 && score <= -4
  }
  if (metric === "distribution_rate") {
    return score >= 6 && score < 10
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
  const accent = getColorForMetric(fund, metric, rankScore)
  const value = getValueForMetric(fund, metric, rankScore)
  const darkInk = chipNeedsDarkInk(fund, metric, rankScore)
  const chipText = darkInk ? "text-[var(--gy-ink)]" : "text-white"

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
      {/* Medicare-style task card: white/surface + colored score chip */}
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="gy-task-card gy-tap flex w-full flex-col items-stretch overflow-hidden !gap-0 !p-0 text-left transition-colors hover:bg-[var(--page-surface-2)]"
        aria-label={`Rank ${rank}. ${fund.symbol}: ${getMetricLabel(metric, fund)} ${value}. Open details.`}
        aria-expanded={isExpanded}
        aria-haspopup="dialog"
      >
        <div className="flex w-full items-center gap-3 px-4 py-3.5">
          <div
            className={`${accent} ${chipText} flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg`}
          >
            <span className="text-[length:var(--gy-text-xs)] font-semibold leading-none opacity-90">
              #{rank}
            </span>
            <span className="text-[length:var(--gy-text-sm)] font-bold leading-tight">{value}</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[length:var(--gy-text-lg)] font-bold text-[var(--page-text)]">
              {fund.symbol}
            </span>
            <span className="block truncate text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
              {getMetricLabel(metric, fund)}
            </span>
          </div>
          <span className="shrink-0 text-[length:var(--gy-text-lg)] text-[var(--gy-blue)]" aria-hidden>
            →
          </span>
        </div>
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
            className="gy-task-card fixed z-40 left-4 right-4 top-1/2 max-h-[85vh] w-auto max-w-md -translate-y-1/2 overflow-y-auto outline-none mx-auto"
          >
            <div className={`${accent} ${chipText} px-4 py-4`}>
              <p className="text-[length:var(--gy-text-sm)] font-semibold opacity-90">Rank #{rank}</p>
              <h4 id={titleId} className="text-[length:var(--gy-text-2xl)] font-bold leading-tight">
                {fund.symbol}
              </h4>
              <p className="mt-1 text-[length:var(--gy-text-base)] leading-snug opacity-95">{fund.name}</p>
              <p className="mt-3 text-[length:var(--gy-text-sm)] font-semibold opacity-90">
                RANK* score: <span className="text-[length:var(--gy-text-xl)]">{rankScore ?? "—"}</span>
              </p>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
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
              className="gy-tap min-h-12 w-full border-t border-[var(--page-border)] bg-[var(--page-surface)] text-[length:var(--gy-text-base)] font-semibold text-[var(--page-text)] hover:bg-[var(--page-surface-2)]"
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
          ? "text-[var(--page-accent)]"
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
      <span className="block text-[length:var(--gy-text-xs)] text-[var(--page-muted)]">{label}</span>
      <span className={`block text-[length:var(--gy-text-base)] font-bold ${tone}`}>
        {value !== null ? value.toFixed(2) : "n/a"}
      </span>
    </div>
  )
}

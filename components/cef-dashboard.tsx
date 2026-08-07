"use client"

import { useEffect, useState } from "react"
import type { CEFData, SortMetric } from "@/lib/cef-data"
import { getEffectiveZScore } from "@/lib/cef-data"
import type { SyncStatus } from "@/lib/cef-snapshot"
import { HeatmapGrid } from "./heatmap-grid"
import { HeatmapLegend } from "./heatmap-legend"

const pillarMetrics: {
  value: SortMetric
  label: string
  description: string
  short: string
}[] = [
  {
    value: "zscore",
    label: "Z-Score",
    description: "How cheap vs its own history",
    short: "Z-Score",
  },
  {
    value: "discount",
    label: "Discount",
    description: "Price vs fund value (NAV)",
    short: "Discount",
  },
  {
    value: "distribution_rate",
    label: "Current Yield",
    description: "Current distribution yield",
    short: "Yield",
  },
  {
    value: "technical",
    label: "Technical",
    description: "Chart rating from Barchart",
    short: "Technical",
  },
  {
    value: "trend",
    label: "Trend",
    description: "Recent momentum score",
    short: "Trend",
  },
]

const allMetrics = [
  ...pillarMetrics,
  {
    value: "rank" as SortMetric,
    label: "RANK*",
    description: "40% Z + 20% Current Yield + 20% Technical + 20% Discount",
    short: "RANK*",
  },
]

const rankOptions: {
  value: SortMetric
  label: string
  description: string
  short: string
}[] = [
  {
    value: "rank",
    label: "RANK*",
    description: "Combined score — best overall picks",
    short: "RANK*",
  },
  ...pillarMetrics,
]

type TextSize = "md" | "lg" | "xl"

const TEXT_SCALE: Record<TextSize, number> = {
  md: 1,
  lg: 1.08,
  xl: 1.16,
}

interface CEFDashboardProps {
  funds: CEFData[]
  updatedAt: string | null
  dataAsOf: string | null
  syncStatus: SyncStatus | null
}

function formatLastFetched(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatAsOf(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getStoredTextSize(): TextSize {
  if (typeof window === "undefined") return "md"
  const stored = window.localStorage.getItem("gy-text-size")
  if (stored === "md" || stored === "lg" || stored === "xl") return stored
  return "md"
}

export function CEFDashboard({ funds, updatedAt, dataAsOf, syncStatus }: CEFDashboardProps) {
  const [activeMetric, setActiveMetric] = useState<SortMetric>("rank")
  const [textSize, setTextSize] = useState<TextSize>("md")
  const [prefsReady, setPrefsReady] = useState(false)

  useEffect(() => {
    setTextSize(getStoredTextSize())
    setPrefsReady(true)
  }, [])

  useEffect(() => {
    if (!prefsReady) return
    const root = document.documentElement
    root.classList.remove("dark")
    root.style.setProperty("--gy-scale", String(TEXT_SCALE[textSize]))
    window.localStorage.setItem("gy-text-size", textSize)
  }, [textSize, prefsReady])

  const currentMetric = allMetrics.find((m) => m.value === activeMetric)
  const lastFetchedLabel = updatedAt ? formatLastFetched(updatedAt) : null
  const dataDateLabel = dataAsOf ? formatAsOf(dataAsOf) : null
  const isLive = Boolean(updatedAt)
  const hasFunds = funds.length > 0

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--page-bg)] text-[var(--page-on-bg)] max-lg:h-auto max-lg:min-h-dvh max-lg:overflow-visible">
      <header className="shrink-0 border-b border-white/15 bg-[var(--page-header)]">
        <div className="gy-brand-stripe" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 md:px-8">
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--gy-text-sm)] font-bold tracking-[var(--gy-tracking)]">
              <span className="text-[#7dcf4a]">Game of Yield</span>
              <span className="text-[#f07178]"> · Income Engine</span>
            </p>
            <h1 className="mt-0.5 text-[length:var(--gy-text-lg)] font-bold leading-snug text-[var(--page-on-bg)] sm:text-[length:var(--gy-text-xl)]">
              Top Dogs 20/20 Play Deck
            </h1>
            <p
              className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[length:var(--gy-text-sm)] leading-snug text-[var(--page-on-bg-muted)]"
              aria-label="Data status"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--page-on-bg)]">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isLive
                      ? syncStatus === "partial"
                        ? "bg-[var(--gy-yellow)]"
                        : "bg-[var(--gy-green)]"
                      : "bg-[var(--page-on-bg-muted)]"
                  }`}
                  aria-hidden
                />
                {isLive
                  ? syncStatus === "partial"
                    ? "Partial sync"
                    : "Data synced"
                  : "Sample data"}
              </span>
              {lastFetchedLabel && <span className="break-words">· {lastFetchedLabel}</span>}
              {dataDateLabel && <span className="hidden sm:inline">· As of {dataDateLabel}</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            <div
              className="inline-flex overflow-hidden rounded-lg border border-[var(--page-border)] shadow-[var(--page-shadow)]"
              role="group"
              aria-label="Text size"
            >
              {(
                [
                  { id: "md", label: "A", title: "Default text" },
                  { id: "lg", label: "A+", title: "Larger text" },
                  { id: "xl", label: "A++", title: "Largest text" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.title}
                  onClick={() => setTextSize(opt.id)}
                  className={`min-h-10 min-w-10 px-2.5 text-[length:var(--gy-text-sm)] font-semibold transition-colors ${
                    textSize === opt.id
                      ? "bg-[var(--page-cta)] text-[var(--page-cta-text)]"
                      : "bg-[var(--page-surface)] text-[var(--page-muted)] hover:bg-[var(--page-surface-2)]"
                  }`}
                  aria-pressed={textSize === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden px-5 py-3 md:px-8 lg:gap-4 lg:py-4 max-lg:overflow-x-hidden max-lg:overflow-y-auto"
      >
        <section className="shrink-0" aria-label="Choose a ranking">
          <div
            className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-6 lg:overflow-visible"
            role="tablist"
          >
            {rankOptions.map((m) => {
              const selected = activeMetric === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  role="tab"
                  title={m.description}
                  aria-selected={selected}
                  aria-pressed={selected}
                  onClick={() => setActiveMetric(m.value)}
                  className={`min-h-11 shrink-0 rounded-xl border px-4 text-[length:var(--gy-text-sm)] font-semibold shadow-[var(--page-shadow)] transition-colors lg:w-full lg:px-3 ${
                    selected
                      ? "border-[var(--gy-blue)] bg-[var(--gy-blue-soft)] text-[var(--page-text)] shadow-[inset_0_0_0_2px_var(--gy-blue)]"
                      : "border-[var(--page-border)] bg-[var(--page-surface)] text-[var(--page-text)] hover:bg-[var(--page-surface-2)]"
                  }`}
                >
                  <span className="lg:hidden">{m.short}</span>
                  <span className="hidden lg:inline">
                    {m.label === "Current Yield" ? "Yield" : m.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[length:var(--gy-text-sm)] text-[var(--page-on-bg-muted)]">
            Top 20 by {currentMetric?.label}
            <span className="hidden sm:inline"> — {currentMetric?.description}</span>
          </p>
        </section>

        <section className="flex min-h-0 flex-1 flex-col max-lg:flex-none" aria-label="Heatmap">
          <h2 className="sr-only">Top 20 — {currentMetric?.label}</h2>
          <div className="min-h-0 flex-1 max-lg:flex-none">
            {hasFunds ? (
              <HeatmapGrid data={funds} metric={activeMetric} count={20} />
            ) : (
              <div className="rounded-xl border border-[var(--page-border)] bg-[var(--page-surface)] px-5 py-8 text-center text-[var(--page-text)] shadow-[var(--page-shadow)]">
                <p className="text-[length:var(--gy-text-lg)] font-bold">No fund data yet</p>
                <p className="mt-2 text-[length:var(--gy-text-base)] text-[var(--page-muted)]">
                  Run the daily sync to load the Top 20 play deck.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="shrink-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-[length:var(--gy-text-sm)] font-semibold text-[var(--page-on-bg-muted)]">
                Color guide
              </p>
              <HeatmapLegend metric={activeMetric} />
            </div>

            <a
              href="https://gameofyield.vercel.app/"
              className="gy-top50-cta inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[var(--page-cta)] px-4 text-[length:var(--gy-text-sm)] font-bold text-[var(--page-cta-text)] no-underline shadow-[var(--page-shadow)] sm:self-center"
            >
              Top 50 index
              <span className="gy-top50-arrow" aria-hidden>
                →
              </span>
            </a>
          </div>

          {hasFunds && (
            <div
              className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--page-border)] bg-[var(--page-surface)] px-3 py-2.5 text-[var(--page-text)] shadow-[var(--page-shadow)]"
              aria-label="Averages"
            >
              <StatCard
                label="Average NAV Discount"
                value={`${(funds.reduce((s, f) => s + f.discount, 0) / funds.length).toFixed(1)}%`}
              />
              <StatCard
                label="Average Current Yield"
                value={`${(funds.reduce((s, f) => s + f.distribution_rate, 0) / funds.length).toFixed(1)}%`}
                emphasize
              />
              <StatCard
                label="Average Z-Score"
                value={(
                  funds.reduce((s, f) => s + getEffectiveZScore(f), 0) / funds.length
                ).toFixed(2)}
              />
            </div>
          )}
        </section>
      </main>

      <footer className="shrink-0 border-t border-white/15 bg-[var(--page-header)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-2.5 text-center md:px-8 lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <p className="text-[length:var(--gy-text-sm)] text-[var(--page-on-bg-muted)]">
            Data from{" "}
            <span className="font-semibold text-[var(--page-on-bg)] underline decoration-[var(--gy-yellow)]">
              CEF Connect
            </span>{" "}
            &{" "}
            <span className="font-semibold text-[var(--page-on-bg)] underline decoration-[var(--gy-yellow)]">
              Barchart
            </span>
            <span className="hidden sm:inline">
              {" "}
              · RANK* = 40% Z + 20% Yield + 20% Tech + 20% Discount
            </span>
          </p>
          <p className="text-[length:var(--gy-text-sm)] text-[var(--page-on-bg-muted)]">
            Need help? Ask your Game of Yield coach.
          </p>
        </div>
      </footer>
    </div>
  )
}

function StatCard({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="text-center">
      <span className="block text-[length:var(--gy-text-sm)] leading-snug text-[var(--page-muted)]">
        {label}
      </span>
      <span
        className={`mt-1 block text-[length:var(--gy-text-lg)] font-bold leading-tight ${
          emphasize ? "text-[var(--gy-green)]" : "text-[var(--page-text)]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

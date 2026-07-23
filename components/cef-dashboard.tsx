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
type ThemeMode = "light" | "dark"

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

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light"
  const stored = window.localStorage.getItem("gy-theme")
  if (stored === "dark" || stored === "light") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
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
  const [theme, setTheme] = useState<ThemeMode>("light")
  const [prefsReady, setPrefsReady] = useState(false)

  useEffect(() => {
    setTheme(getStoredTheme())
    setTextSize(getStoredTextSize())
    setPrefsReady(true)
  }, [])

  useEffect(() => {
    if (!prefsReady) return
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem("gy-theme", theme)
  }, [theme, prefsReady])

  useEffect(() => {
    if (!prefsReady) return
    const root = document.documentElement
    root.style.setProperty("--gy-scale", String(TEXT_SCALE[textSize]))
    window.localStorage.setItem("gy-text-size", textSize)
  }, [textSize, prefsReady])

  const currentMetric = allMetrics.find((m) => m.value === activeMetric)
  const lastFetchedLabel = updatedAt ? formatLastFetched(updatedAt) : null
  const dataDateLabel = dataAsOf ? formatAsOf(dataAsOf) : null
  const isLive = Boolean(updatedAt)
  const hasFunds = funds.length > 0

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)] max-lg:h-auto max-lg:min-h-dvh max-lg:overflow-visible">
      <header className="shrink-0 border-b border-[var(--page-border)] bg-[var(--page-header)]">
        <div className="gy-brand-stripe" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <div className="min-w-0">
            <p className="truncate text-[length:var(--gy-text-sm)] font-bold leading-tight tracking-[var(--gy-tracking)]">
              <span className="text-[var(--gy-green)]">Game of Yield</span>
              <span className="text-[var(--gy-red)]"> · Income Engine</span>
            </p>
            <h1 className="truncate text-[length:var(--gy-text-lg)] font-bold leading-tight lg:text-[length:var(--gy-text-xl)]">
              Top Dogs 20/20 Play Deck
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div
              className="inline-flex overflow-hidden rounded-md border border-[var(--page-border)]"
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
                  className={`min-h-9 min-w-9 px-2 text-[length:var(--gy-text-sm)] font-semibold transition-colors lg:min-h-10 lg:min-w-10 ${
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

            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="min-h-9 rounded-md border border-[var(--page-border)] bg-[var(--page-surface)] px-3 text-[length:var(--gy-text-sm)] font-semibold text-[var(--page-text)] hover:bg-[var(--page-surface-2)] lg:min-h-10"
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </div>

        {/* Sync in header — keeps mobile heatmap above the fold */}
        <div className="border-t border-[var(--page-border)] bg-[var(--page-surface)]">
          <div
            className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-1.5 text-[length:var(--gy-text-sm)] md:px-6"
            aria-label="Data status"
          >
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span
                className={`h-2 w-2 rounded-full ${
                  isLive
                    ? syncStatus === "partial"
                      ? "bg-[var(--gy-gold)]"
                      : "bg-[var(--gy-success)]"
                    : "bg-[var(--page-muted)]"
                }`}
                aria-hidden
              />
              {isLive ? (syncStatus === "partial" ? "Partial sync" : "Data synced") : "Sample data"}
            </span>
            {lastFetchedLabel && (
              <span className="truncate text-[var(--page-muted)]">Fetched {lastFetchedLabel}</span>
            )}
            {dataDateLabel && <span className="text-[var(--page-muted)]">As of {dataDateLabel}</span>}
            <span className="hidden text-[var(--page-muted)] lg:inline">· Tap a fund for details</span>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 overflow-hidden px-4 py-2 md:px-6 max-lg:overflow-x-hidden max-lg:overflow-y-auto lg:gap-2 lg:py-2.5"
      >
        <section className="shrink-0" aria-label="Choose a ranking">
          <div
            className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-6 lg:overflow-visible"
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
                  className={`min-h-9 shrink-0 rounded-md border px-3 text-[length:var(--gy-text-sm)] font-semibold transition-colors lg:min-h-10 lg:w-full lg:px-2 ${
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
          <p className="mt-1 truncate text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
            {currentMetric?.label}: {currentMetric?.description}
          </p>
        </section>

        {/* Heatmap — fills leftover height on desktop; first content focus on mobile */}
        <section className="flex min-h-0 flex-1 flex-col gap-1 max-lg:flex-none">
          <h2 className="shrink-0 text-[length:var(--gy-text-sm)] font-bold tracking-[var(--gy-tracking)]">
            Top 20 — {currentMetric?.label}
          </h2>
          <div className="min-h-0 flex-1 max-lg:flex-none">
            {hasFunds ? (
              <HeatmapGrid data={funds} metric={activeMetric} count={20} />
            ) : (
              <div className="rounded-lg border border-[var(--page-border)] bg-[var(--page-surface)] px-4 py-6 text-center shadow-[var(--page-shadow)]">
                <p className="text-[length:var(--gy-text-base)] font-bold">No fund data yet</p>
                <p className="mt-1 text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
                  Run the daily sync to load the Top 20 play deck.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="shrink-0 space-y-1.5">
          <div className="rounded-lg border border-[var(--page-border)] bg-[var(--page-surface)] px-3 py-1.5 shadow-[var(--page-shadow)]">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-[length:var(--gy-text-sm)] font-bold">Color guide</h3>
              <button
                type="button"
                className="text-[length:var(--gy-text-sm)] font-semibold text-[var(--gy-blue)] underline decoration-[var(--gy-blue)] underline-offset-2"
              >
                Top 50 index →
              </button>
            </div>
            <HeatmapLegend metric={activeMetric} />
          </div>

          {hasFunds && (
            <div className="grid grid-cols-3 gap-1.5" aria-label="Averages">
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

      <footer className="shrink-0 border-t border-[var(--page-border)] bg-[var(--page-header)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-1.5 text-center md:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-2 lg:text-left">
          <p className="text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
            Data from{" "}
            <span className="font-semibold text-[var(--page-text)] underline decoration-[var(--gy-blue)]">
              CEF Connect
            </span>{" "}
            &{" "}
            <span className="font-semibold text-[var(--page-text)] underline decoration-[var(--gy-blue)]">
              Barchart
            </span>
            <span className="hidden sm:inline">
              {" "}
              · RANK* = 40% Z + 20% Yield + 20% Tech + 20% Discount
            </span>
          </p>
          <p className="text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
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
    <div className="rounded-lg border border-[var(--page-border)] bg-[var(--page-surface)] px-2 py-1.5 text-center shadow-[var(--page-shadow)]">
      <span className="block text-[length:var(--gy-text-sm)] leading-tight text-[var(--page-muted)]">
        {label}
      </span>
      <span
        className={`mt-0.5 block text-[length:var(--gy-text-base)] font-bold leading-tight lg:text-[length:var(--gy-text-lg)] ${
          emphasize ? "text-[var(--gy-gold)]" : "text-[var(--page-text)]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

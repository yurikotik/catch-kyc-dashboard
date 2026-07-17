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
  action: string
}[] = [
  {
    value: "zscore",
    label: "Z-Score",
    description: "How cheap vs its own history",
    action: "Check Z-Score",
  },
  {
    value: "discount",
    label: "Discount",
    description: "Price vs fund value (NAV)",
    action: "Check Discount",
  },
  {
    value: "distribution_rate",
    label: "Income rate",
    description: "Current distribution yield",
    action: "Check Income",
  },
  {
    value: "technical",
    label: "Technical",
    description: "Chart rating from Barchart",
    action: "Check Technical",
  },
  {
    value: "trend",
    label: "Trend",
    description: "Recent momentum score",
    action: "Check Trend",
  },
]

const allMetrics = [
  ...pillarMetrics,
  {
    value: "rank" as SortMetric,
    label: "RANK*",
    description: "40% Z + 20% Income + 20% Technical + 20% Discount",
    action: "See RANK*",
  },
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
    <div className="flex min-h-screen flex-col bg-[var(--page-bg)] text-[var(--page-text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--page-border)] bg-[var(--page-header)]">
        <div className="gy-brand-stripe" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="mx-auto w-full max-w-6xl px-6 py-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[length:var(--gy-text-sm)] font-bold tracking-[var(--gy-tracking)]">
                <span className="text-[var(--gy-green)]">Game of Yield</span>
                <span className="text-[var(--gy-red)]"> · Income Engine</span>
              </p>
              <h1 className="mt-0.5 text-[length:var(--gy-text-xl)] font-bold leading-tight">
                Top Dogs 20/20 Play Deck
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
                    className={`gy-tap min-w-12 px-3 text-[length:var(--gy-text-base)] font-semibold transition-colors ${
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
                className="gy-tap rounded-md border border-[var(--page-border)] bg-[var(--page-surface)] px-4 text-[length:var(--gy-text-base)] font-semibold text-[var(--page-text)] hover:bg-[var(--page-surface-2)]"
                aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              >
                {theme === "light" ? "Dark" : "Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="gy-stack mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:px-8"
      >
        <section className="gy-task-card w-full !min-h-0">
          <h2 className="text-[length:var(--gy-text-2xl)] font-bold leading-tight">
            What do you want to check?
          </h2>
          <p className="gy-section-help !mt-0 max-w-2xl text-[length:var(--gy-text-base)]">
            Browse the Top 20 closed-end funds by the measure you care about. Open a fund for
            price, discount, and income details.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[length:var(--gy-text-sm)]">
            <span className="inline-flex items-center gap-2 font-semibold">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
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
              <span className="text-[var(--page-muted)]">Last fetched: {lastFetchedLabel}</span>
            )}
            {dataDateLabel && (
              <span className="text-[var(--page-muted)]">Data as of {dataDateLabel}</span>
            )}
          </div>
        </section>

        <section aria-label="Choose a ranking">
          <h3 className="gy-section-title">Choose a ranking</h3>
          <p className="gy-section-help">One tap sets how the Top 20 are ordered.</p>
          <div
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMetric === "rank"}
              aria-pressed={activeMetric === "rank"}
              onClick={() => setActiveMetric("rank")}
              className="gy-task-card gy-tap w-full transition-colors hover:bg-[var(--page-surface-2)]"
            >
              <span className="block text-[length:var(--gy-text-lg)] font-bold text-[var(--page-cta)]">
                See RANK*
              </span>
              <span className="block text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
                Combined score — best overall picks
              </span>
            </button>

            {pillarMetrics.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={activeMetric === m.value}
                aria-pressed={activeMetric === m.value}
                onClick={() => setActiveMetric(m.value)}
                className="gy-task-card gy-tap w-full transition-colors hover:bg-[var(--page-surface-2)]"
              >
                <span className="block text-[length:var(--gy-text-lg)] font-bold">{m.action}</span>
                <span className="block text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
                  {m.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="gy-section-title">Top 20 — {currentMetric?.label}</h3>
          <p className="gy-section-help">
            {currentMetric?.description}. Tap any fund for details.
          </p>

          <div className="mt-4">
            {hasFunds ? (
              <HeatmapGrid data={funds} metric={activeMetric} count={20} />
            ) : (
              <div className="gy-task-card w-full items-center text-center">
                <p className="text-[length:var(--gy-text-lg)] font-bold">No fund data yet</p>
                <p className="text-[length:var(--gy-text-base)] text-[var(--page-muted)]">
                  Run the daily sync to load the Top 20 play deck.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="gy-task-card w-full !min-h-0">
          <h3 className="gy-section-title">Color guide</h3>
          <div className="mt-3 w-full">
            <HeatmapLegend metric={activeMetric} />
          </div>
        </section>

        {hasFunds && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Averages">
            <StatCard
              label="Average discount"
              value={`${(funds.reduce((s, f) => s + f.discount, 0) / funds.length).toFixed(1)}%`}
            />
            <StatCard
              label="Average income rate"
              value={`${(funds.reduce((s, f) => s + f.distribution_rate, 0) / funds.length).toFixed(1)}%`}
              emphasize
            />
            <StatCard
              label="Average Z-Score"
              value={(funds.reduce((s, f) => s + getEffectiveZScore(f), 0) / funds.length).toFixed(2)}
            />
          </section>
        )}

        <section>
          <button
            type="button"
            className="gy-task-card gy-tap flex w-full flex-row items-center justify-between gap-4 border-l-4 border-l-[var(--gy-green)] !min-h-0 transition-colors hover:bg-[var(--page-surface-2)]"
          >
            <span>
              <span className="block text-[length:var(--gy-text-lg)] font-bold">
                Open Top 50 index
              </span>
              <span className="mt-1 block text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
                Full watchlist with all five measures
              </span>
            </span>
            <span
              className="text-[length:var(--gy-text-xl)] font-bold text-[var(--gy-blue)]"
              aria-hidden
            >
              →
            </span>
          </button>
        </section>
      </main>

      <footer className="border-t border-[var(--page-border)] bg-[var(--page-header)]">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center md:px-8">
          <p className="text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
            Data sourced from{" "}
            <span className="font-semibold text-[var(--page-text)] underline decoration-[var(--gy-blue)]">
              CEF Connect
            </span>{" "}
            and{" "}
            <span className="font-semibold text-[var(--page-text)] underline decoration-[var(--gy-blue)]">
              Barchart
            </span>
          </p>
          <p className="mt-2 text-[length:var(--gy-text-sm)] leading-relaxed text-[var(--page-muted)]">
            RANK* = 40% Z-Score + 20% Income + 20% Technical + 20% Discount (Top 20 from the
            watchlist)
          </p>
          <p className="mt-3 text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">
            Need help? Email your Game of Yield coach or ask in the club chat.
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
    <div className="gy-task-card w-full items-center !min-h-0 text-center">
      <span className="block text-[length:var(--gy-text-sm)] text-[var(--page-muted)]">{label}</span>
      <span
        className={`mt-1 block text-[length:var(--gy-text-xl)] font-bold ${
          emphasize ? "text-[var(--gy-gold)]" : "text-[var(--page-text)]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

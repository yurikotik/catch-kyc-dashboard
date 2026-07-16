import type { CEFData } from "./cef-data"

export type SyncStatus = "complete" | "partial"

export interface CEFSnapshot {
  /** ISO timestamp of when the sync finished */
  updatedAt: string
  /** Trading date the data refers to (from CEF Connect's LastUpdated) */
  dataAsOf: string | null
  source: "cefconnect+barchart"
  syncStatus: SyncStatus
  /** Funds shown on dashboard (Top 20) */
  fundsProcessed: number
  /** Full watchlist size (Top 50) */
  universeCount: number
  topCount: number
  missingSymbols: string[]
  staleSymbols: string[]
  errors: string[]
  /** Top 20 ranked funds for display */
  funds: CEFData[]
  /** Full ranked watchlist universe */
  watchlist: CEFData[]
}

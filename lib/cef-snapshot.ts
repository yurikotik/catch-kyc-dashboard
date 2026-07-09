import type { CEFData } from "./cef-data"

export type SyncStatus = "complete" | "partial"

export interface CEFSnapshot {
  /** ISO timestamp of when the sync finished */
  updatedAt: string
  /** Trading date the data refers to (from CEF Connect's LastUpdated) */
  dataAsOf: string | null
  source: "cefconnect"
  syncStatus: SyncStatus
  fundsProcessed: number
  /** Tickers not found in the CEF Connect universe (e.g. merged/liquidated funds) */
  missingSymbols: string[]
  /** Tickers whose data was carried over from a previous snapshot because this sync failed for them */
  staleSymbols: string[]
  errors: string[]
  funds: CEFData[]
}

import type { CEFData } from "./cef-data"
import type { CEFSnapshot } from "./cef-snapshot"
import { scrapeTrackedFunds, TRACKED_SYMBOLS } from "./cef-scraper"
import { loadSnapshot, saveSnapshot } from "./cef-store"

/**
 * Runs a full sync: scrape all tracked funds, merge with the previous
 * snapshot for any funds that failed this run (so one bad fund doesn't
 * blank out the dashboard), and persist to Vercel Blob.
 */
export async function syncCEFData(): Promise<CEFSnapshot> {
  const previous = await loadSnapshot()
  const result = await scrapeTrackedFunds()

  const scraped = new Map(result.funds.map((f) => [f.symbol, f]))
  const staleSymbols: string[] = []
  const funds: CEFData[] = []

  for (const symbol of TRACKED_SYMBOLS) {
    const fresh = scraped.get(symbol.toUpperCase())
    if (fresh) {
      funds.push(fresh)
      continue
    }
    // Carry over the previous snapshot's data for funds that failed this run
    const prior = previous?.funds.find((f) => f.symbol === symbol.toUpperCase())
    if (prior) {
      funds.push(prior)
      staleSymbols.push(symbol)
    }
    // Symbols with neither fresh nor prior data are reported via
    // missingSymbols/errors and simply drop off the heatmap.
  }

  const snapshot: CEFSnapshot = {
    updatedAt: new Date().toISOString(),
    dataAsOf: result.dataAsOf,
    source: "cefconnect",
    syncStatus:
      result.missingSymbols.length === 0 && staleSymbols.length === 0 && result.errors.length === 0
        ? "complete"
        : "partial",
    fundsProcessed: funds.length,
    missingSymbols: result.missingSymbols,
    staleSymbols,
    errors: result.errors,
    funds,
  }

  await saveSnapshot(snapshot)
  return snapshot
}

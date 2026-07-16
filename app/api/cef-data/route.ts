import { cefData } from "@/lib/cef-data"
import type { CEFSnapshot } from "@/lib/cef-snapshot"
import { loadSnapshot } from "@/lib/cef-store"
import { TOP_DISPLAY_COUNT, WATCHLIST_SYMBOLS } from "@/lib/watchlist"

export const dynamic = "force-dynamic"

export async function GET() {
  const snapshot = await loadSnapshot()
  if (snapshot) {
    return Response.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  }

  const fallback: CEFSnapshot = {
    updatedAt: "",
    dataAsOf: null,
    source: "cefconnect+barchart",
    syncStatus: "partial",
    fundsProcessed: cefData.length,
    universeCount: WATCHLIST_SYMBOLS.length,
    topCount: TOP_DISPLAY_COUNT,
    missingSymbols: [],
    staleSymbols: [],
    errors: ["No synced snapshot available; serving bundled sample data"],
    funds: cefData,
    watchlist: cefData,
  }
  return Response.json(fallback)
}

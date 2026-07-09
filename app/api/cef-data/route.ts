import { cefData } from "@/lib/cef-data"
import type { CEFSnapshot } from "@/lib/cef-snapshot"
import { loadSnapshot } from "@/lib/cef-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const snapshot = await loadSnapshot()
  if (snapshot) {
    return Response.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  }

  // No synced snapshot yet (first deploy / Blob not configured): serve the
  // bundled sample data so the dashboard still renders.
  const fallback: CEFSnapshot = {
    updatedAt: "",
    dataAsOf: null,
    source: "cefconnect",
    syncStatus: "partial",
    fundsProcessed: cefData.length,
    missingSymbols: [],
    staleSymbols: [],
    errors: ["No synced snapshot available; serving bundled sample data"],
    funds: cefData,
  }
  return Response.json(fallback)
}

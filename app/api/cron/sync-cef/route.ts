import { syncCEFData } from "@/lib/sync-cef-data"

// A full sync (~20 funds x 2.5-4s polite delay + request time) takes ~90s;
// 300s leaves headroom for retries and fits both Hobby and Pro fluid limits.
export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const snapshot = await syncCEFData()
    return Response.json({
      ok: true,
      syncStatus: snapshot.syncStatus,
      fundsProcessed: snapshot.fundsProcessed,
      missingSymbols: snapshot.missingSymbols,
      staleSymbols: snapshot.staleSymbols,
      errors: snapshot.errors,
      updatedAt: snapshot.updatedAt,
      dataAsOf: snapshot.dataAsOf,
    })
  } catch (err) {
    console.error("CEF sync failed:", err)
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

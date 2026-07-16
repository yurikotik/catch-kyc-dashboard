import { runFullSync } from "@/lib/sync-cef-data"

// The full watchlist scrapes + ranks in a few seconds, so the whole sync runs
// in one invocation. 60s is the Hobby cap and leaves ample headroom.
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runFullSync()
    return Response.json(result, { status: result.ok ? 200 : 500 })
  } catch (err) {
    console.error("CEF sync failed:", err)
    return Response.json(
      { ok: false, action: "failed", error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}

import { runSyncBatch } from "@/lib/sync-cef-data"

// Hobby-friendly: each batch processes 2 funds (~15-30s). Chaining handles the rest.
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const batchParam = url.searchParams.get("batch")
  const batchIndex = batchParam === null ? 0 : Number(batchParam)
  if (!Number.isInteger(batchIndex) || batchIndex < 0) {
    return Response.json({ error: "Invalid batch parameter" }, { status: 400 })
  }

  try {
    const result = await runSyncBatch(batchIndex)
    const status = result.ok ? 200 : 500
    return Response.json(result, { status })
  } catch (err) {
    console.error("CEF sync batch failed:", err)
    return Response.json(
      {
        ok: false,
        action: "failed",
        batch: batchIndex,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

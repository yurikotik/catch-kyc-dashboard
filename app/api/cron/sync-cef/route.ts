import { after } from "next/server"
import { runSyncBatch } from "@/lib/sync-cef-data"

// Hobby-safe: the response returns immediately and the actual batch work runs
// in `after()`. Each invocation only ever does ONE small batch (2 funds) plus a
// fast trigger of the next batch, so no single function approaches the 60s cap.
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

  // Do the scrape + chaining after responding. This keeps the function short
  // and lets the chain advance one invocation at a time without blocking.
  after(async () => {
    try {
      await runSyncBatch(batchIndex)
    } catch (err) {
      console.error(`CEF sync batch ${batchIndex} failed:`, err)
    }
  })

  return Response.json({ ok: true, action: "scheduled", batch: batchIndex })
}

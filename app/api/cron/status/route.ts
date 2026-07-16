import { loadSnapshot, loadSyncJob } from "@/lib/cef-store"
import { TOTAL_BATCHES } from "@/lib/sync-cef-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const [job, snapshot] = await Promise.all([loadSyncJob(), loadSnapshot()])

  const completed = job?.completedBatches?.length ?? 0
  const stalledMs =
    job?.status === "running" && job.lastBatchAt
      ? Date.now() - new Date(job.lastBatchAt).getTime()
      : null

  return Response.json(
    {
      job: job
        ? {
            status: job.status,
            tradingDay: job.tradingDay,
            progress: `${completed}/${TOTAL_BATCHES}`,
            completedBatches: job.completedBatches,
            startedAt: job.startedAt,
            lastBatchAt: job.lastBatchAt,
            completedAt: job.completedAt,
            errorCount: job.errors?.length ?? 0,
            errors: job.errors ?? [],
            // A running job that hasn't advanced in >2 min likely died mid-chain.
            likelyStalled: stalledMs !== null && stalledMs > 120_000,
            secondsSinceLastBatch: stalledMs !== null ? Math.round(stalledMs / 1000) : null,
          }
        : null,
      snapshot: snapshot
        ? {
            updatedAt: snapshot.updatedAt,
            dataAsOf: snapshot.dataAsOf,
            syncStatus: snapshot.syncStatus,
            fundsProcessed: snapshot.fundsProcessed,
            missingSymbols: snapshot.missingSymbols,
            staleSymbols: snapshot.staleSymbols,
            errors: snapshot.errors,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

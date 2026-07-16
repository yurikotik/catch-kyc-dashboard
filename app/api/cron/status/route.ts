import { loadSnapshot, loadSyncJob } from "@/lib/cef-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const [job, snapshot] = await Promise.all([loadSyncJob(), loadSnapshot()])

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
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            errorCount: job.errors?.length ?? 0,
            errors: job.errors ?? [],
            // A run that hasn't finished in >2 min likely died (should take ~15s).
            likelyStalled: stalledMs !== null && stalledMs > 120_000,
            secondsSinceStart: stalledMs !== null ? Math.round(stalledMs / 1000) : null,
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

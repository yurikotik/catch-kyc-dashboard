import { CEFDashboard } from "@/components/cef-dashboard"
import { cefData } from "@/lib/cef-data"
import { loadSnapshot } from "@/lib/cef-store"

// Re-render at most every 5 minutes; picks up new snapshots after each sync
export const revalidate = 300

export default async function Page() {
  const snapshot = await loadSnapshot()

  return (
    <CEFDashboard
      funds={snapshot?.funds ?? cefData}
      updatedAt={snapshot?.updatedAt ?? null}
      dataAsOf={snapshot?.dataAsOf ?? null}
      syncStatus={snapshot?.syncStatus ?? null}
    />
  )
}

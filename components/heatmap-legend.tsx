import type { SortMetric } from "@/lib/cef-data"

interface LegendStop {
  /** Tailwind bg class matching get*Color() */
  color: string
  /** Short plain-English range */
  label: string
}

/** Stops must match lib/cef-data get*Color thresholds (left = best). */
const legends: Record<SortMetric, LegendStop[]> = {
  rank: [
    { color: "bg-[var(--gy-heat-best)]", label: "80+" },
    { color: "bg-[var(--gy-heat-good)]", label: "65–79" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "50–64" },
    { color: "bg-[var(--gy-heat-mid)]", label: "35–49" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "20–34" },
    { color: "bg-[var(--gy-heat-poor)]", label: "Under 20" },
  ],
  zscore: [
    { color: "bg-[var(--gy-heat-best)]", label: "−2.5 or lower" },
    { color: "bg-[var(--gy-heat-good)]", label: "−2.5 to −2" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "−2 to −1.5" },
    { color: "bg-[var(--gy-heat-mid)]", label: "−1.5 to −1" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "−1 to −0.5" },
    { color: "bg-[var(--gy-heat-warm)]", label: "−0.5 to 0.5" },
    { color: "bg-[var(--gy-heat-poor)]", label: "0.5 to 1.5" },
    { color: "bg-[var(--gy-heat-worst)]", label: "Over 1.5" },
  ],
  zscore_1y: [
    { color: "bg-[var(--gy-heat-best)]", label: "−2.5 or lower" },
    { color: "bg-[var(--gy-heat-good)]", label: "−2.5 to −2" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "−2 to −1.5" },
    { color: "bg-[var(--gy-heat-mid)]", label: "−1.5 to −1" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "−1 to −0.5" },
    { color: "bg-[var(--gy-heat-warm)]", label: "−0.5 to 0.5" },
    { color: "bg-[var(--gy-heat-poor)]", label: "0.5 to 1.5" },
    { color: "bg-[var(--gy-heat-worst)]", label: "Over 1.5" },
  ],
  discount: [
    { color: "bg-[var(--gy-heat-best)]", label: "−15% or deeper" },
    { color: "bg-[var(--gy-heat-good)]", label: "−15% to −10%" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "−10% to −7%" },
    { color: "bg-[var(--gy-heat-mid)]", label: "−7% to −4%" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "−4% to 0%" },
    { color: "bg-[var(--gy-heat-poor)]", label: "Premium (over 0%)" },
  ],
  distribution_rate: [
    { color: "bg-[var(--gy-heat-best)]", label: "14%+" },
    { color: "bg-[var(--gy-heat-good)]", label: "12–14%" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "10–12%" },
    { color: "bg-[var(--gy-heat-mid)]", label: "8–10%" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "6–8%" },
    { color: "bg-[var(--gy-heat-poor)]", label: "Under 6%" },
  ],
  trend: [
    { color: "bg-[var(--gy-heat-best)]", label: "80+" },
    { color: "bg-[var(--gy-heat-good)]", label: "65–79" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "50–64" },
    { color: "bg-[var(--gy-heat-mid)]", label: "35–49" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "20–34" },
    { color: "bg-[var(--gy-heat-poor)]", label: "Under 20" },
  ],
  technical: [
    { color: "bg-[var(--gy-heat-best)]", label: "80+" },
    { color: "bg-[var(--gy-heat-good)]", label: "65–79" },
    { color: "bg-[var(--gy-heat-mid-good)]", label: "50–64" },
    { color: "bg-[var(--gy-heat-mid)]", label: "35–49" },
    { color: "bg-[var(--gy-heat-mid-warm)]", label: "20–34" },
    { color: "bg-[var(--gy-heat-poor)]", label: "Under 20" },
  ],
}

const titles: Record<SortMetric, string> = {
  rank: "RANK* score",
  zscore: "Z-Score",
  zscore_1y: "Z-Score (1 year)",
  discount: "Discount to NAV",
  distribution_rate: "Income rate",
  trend: "Trend score",
  technical: "Technical rating",
}

export function HeatmapLegend({ metric }: { metric: SortMetric }) {
  const items = legends[metric]

  return (
    <div
      className="w-full"
      role="img"
      aria-label={`${titles[metric]} color scale from stronger to more caution`}
    >
      <div
        className="h-3 w-full overflow-hidden rounded-full border border-[var(--page-border)]"
        style={{
          background:
            "linear-gradient(90deg, var(--gy-green) 0%, var(--gy-heat-mid-good) 28%, var(--gy-yellow) 50%, var(--gy-heat-warm) 72%, var(--gy-red) 100%)",
        }}
        aria-hidden
      />
      <div className="mt-1.5 flex justify-between text-[length:var(--gy-text-sm)] font-semibold">
        <span className="text-[var(--gy-green)]">Stronger</span>
        <span className="text-[var(--gy-gold)]">Middle</span>
        <span className="text-[var(--gy-red)]">More caution</span>
      </div>

      <p className="mt-4 text-[length:var(--gy-text-sm)] font-semibold text-[var(--page-text)]">
        {titles[metric]} bands
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              className={`h-8 w-10 shrink-0 rounded-md border border-black/10 ${item.color}`}
              aria-hidden
            />
            <span className="text-[length:var(--gy-text-sm)] text-[var(--page-text)]">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

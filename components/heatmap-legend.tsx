import type { SortMetric } from "@/lib/cef-data"

interface LegendItem {
  color: string
  label: string
}

const legends: Record<SortMetric, LegendItem[]> = {
  rank: [
    { color: "bg-[#228844]", label: "80+ (Top)" },
    { color: "bg-[#6ea832]", label: "50-65" },
    { color: "bg-[#ffb100]", label: "35-50" },
    { color: "bg-[#d48a10]", label: "20-35" },
    { color: "bg-[#b02020]", label: "< 20 (Bottom)" },
  ],
  zscore_1y: [
    { color: "bg-[#228844]", label: "< -2.5 (Best)" },
    { color: "bg-[#6ea832]", label: "-2 to -1.5" },
    { color: "bg-[#ffb100]", label: "-1 to -0.5" },
    { color: "bg-[#c06018]", label: "0.5 to 1" },
    { color: "bg-[#b02020]", label: "> 1.5 (Worst)" },
  ],
  discount: [
    { color: "bg-[#228844]", label: "< -15% (Best)" },
    { color: "bg-[#6ea832]", label: "-10 to -7%" },
    { color: "bg-[#ffb100]", label: "-7 to -4%" },
    { color: "bg-[#d48a10]", label: "-4 to 0%" },
    { color: "bg-[#b02020]", label: "Premium (Worst)" },
  ],
  distribution_rate: [
    { color: "bg-[#228844]", label: "> 14% (Best)" },
    { color: "bg-[#6ea832]", label: "10-12%" },
    { color: "bg-[#ffb100]", label: "8-10%" },
    { color: "bg-[#d48a10]", label: "6-8%" },
    { color: "bg-[#b02020]", label: "< 6% (Worst)" },
  ],
  trend: [
    { color: "bg-[#228844]", label: "80+ (Strong)" },
    { color: "bg-[#6ea832]", label: "50-65" },
    { color: "bg-[#ffb100]", label: "35-50" },
    { color: "bg-[#d48a10]", label: "20-35" },
    { color: "bg-[#b02020]", label: "< 20 (Weak)" },
  ],
}

export function HeatmapLegend({ metric }: { metric: SortMetric }) {
  const items = legends[metric]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
          <span className="text-[10px] text-muted-foreground font-mono">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

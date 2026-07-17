/** Heat chip class from 0–1 score (logo pie: green → yellow → red). */
export function heatChipClass(score01: number): string {
  if (score01 >= 0.7) return "gy-chip-green"
  if (score01 >= 0.4) return "gy-chip-yellow"
  return "gy-chip-red"
}

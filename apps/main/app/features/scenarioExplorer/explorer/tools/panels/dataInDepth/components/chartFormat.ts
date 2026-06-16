/** Shared formatting + neutral colours for the In-Depth chart components. */

export const AXIS = "#9aa7b2"
export const GRID = "#e6ebef"
export const TEXT = "#41525f"

/** Format a value for axis labels / readouts, with unit-aware precision. */
export function fmt(v: number, unit: string): string {
  if (v == null || Number.isNaN(v)) return "–"
  const a = Math.abs(v)
  let d: number
  if (unit === "$B") d = 1
  else if (unit === "ft/yr") d = 2
  else if (unit === "km") d = 1
  else if (unit === "%") d = a < 10 ? 1 : 0
  else if (a >= 100) d = 0
  else if (a >= 10) d = 1
  else d = 2
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

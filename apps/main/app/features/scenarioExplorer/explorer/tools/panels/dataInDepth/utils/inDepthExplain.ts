/**
 * In-Depth Outcomes — plain-language explainer text.
 *
 * Pure, data-free text helpers ported from the standalone prototype
 * (`coeqwal_data_in_depth_prototype.html`: `summaryText`, `howToRead`, and the
 * `details.expl` blocks). DataExplorerView renders the output; keeping the logic
 * here keeps the view component lean and makes the wording easy to find and edit.
 *
 * `summaryText` returns a list of segments rather than an HTML string so the
 * view can render bold runs and up/down delta colouring without
 * dangerouslySetInnerHTML.
 */

import { fmt } from "../components/chartFormat"
import { stats } from "../synthetic/inDepthSyntheticEngine"
import {
  WATER_YEAR_MONTHS,
  type InDepthViewId,
} from "../config/inDepthVariables"
import type { ChartMember } from "../data/inDepthDataSource"

/** One run of the auto-summary sentence. `delta` marks a signed % change. */
export interface SummarySegment {
  text: string
  bold?: boolean
  delta?: "up" | "down"
}

const plain = (text: string): SummarySegment => ({ text })
const strong = (text: string): SummarySegment => ({ text, bold: true })

/** Signed percent change a→b as a bold, up/down-coloured segment. */
function deltaSeg(a: number, b: number): SummarySegment {
  if (!a) return { text: "–", bold: true }
  const d = ((b - a) / Math.abs(a)) * 100
  const text = (d >= 0 ? "+" : "") + d.toFixed(0) + "%"
  return { text, bold: true, delta: d >= 0 ? "up" : "down" }
}

const withUnit = (v: number, unit: string) => `${fmt(v, unit)} ${unit}`

export interface SummaryArgs {
  members: ChartMember[]
  variableId: string
  variableName: string
  view: InDepthViewId
  compareBy: "scen" | "clim" | "loc"
  /** Display unit for the current view ("%" for pct, the variable's unit otherwise). */
  unit: string
  /** Locked "Current operations" reference id — the scenario deltas are measured from. */
  baselineScenarioId: string
  /** Pinned location / climate / scenario display names (for the held-fixed dimensions). */
  locationName: string
  climateName: string
  scenarioName: string
}

/**
 * One-sentence plain-language read of the current chart. Mirrors the prototype's
 * `summaryText`: per-view phrasing, with percent changes measured against
 * current operations (scenario mode) or the first member (climate/location).
 */
export function summaryText(a: SummaryArgs): SummarySegment[] {
  const { members, view, unit } = a
  if (members.length === 0) return []
  const vn = a.variableName.toLowerCase()
  const m0 = members[0]!
  const last = members[members.length - 1]!

  if (view === "monthly") {
    const bands0 = m0.monthlyBands
    if (!bands0 || bands0.length === 0)
      return [plain(`Median monthly ${vn} across the water year.`)]
    let peak = 0
    bands0.forEach((b, i) => {
      if (b.p50 > bands0[peak]!.p50) peak = i
    })
    const segs: SummarySegment[] = [
      plain(`Median ${vn} peaks in `),
      strong(WATER_YEAR_MONTHS[peak]!),
      plain(` for ${m0.label}`),
    ]
    if (members.length > 1 && last.monthlyBands) {
      const sum = (bs: { p50: number }[]) => bs.reduce((t, b) => t + b.p50, 0)
      segs.push(
        plain(`; across the year, ${last.label} runs `),
        deltaSeg(sum(bands0), sum(last.monthlyBands)),
        plain(` vs ${m0.label}`),
      )
    }
    segs.push(plain("."))
    return segs
  }

  if (view === "series") {
    const s0 = m0.monthlySeries
    if (!s0 || s0.length === 0)
      return [plain(`Monthly ${vn} across the simulation.`)]
    const nYears = Math.round(s0.length / 12)
    const st0 = stats(s0)
    const segs: SummarySegment[] = [
      plain(`Monthly ${vn} across the ${nYears}-year simulation. For `),
      strong(m0.label),
      plain(`, the median month is `),
      strong(withUnit(st0.p50, unit)),
      plain(`, with most months between `),
      strong(fmt(st0.p10, unit)),
      plain(` and `),
      strong(withUnit(st0.p90, unit)),
    ]
    if (members.length > 1 && last.monthlySeries) {
      const st1 = stats(last.monthlySeries)
      segs.push(
        plain(`; ${last.label} runs at a median of `),
        strong(withUnit(st1.p50, unit)),
      )
    }
    segs.push(plain("."))
    return segs
  }

  if (view === "cv") {
    const mx = members.reduce((p, c) => (c.cv > p.cv ? c : p))
    const mn = members.reduce((p, c) => (c.cv < p.cv ? c : p))
    return [
      plain(`Year-to-year swings are largest for `),
      strong(mx.label),
      plain(` (CV ${mx.cv.toFixed(2)}) and smallest for `),
      strong(mn.label),
      plain(
        ` (CV ${mn.cv.toFixed(2)}). Higher CV = less predictable from year to year.`,
      ),
    ]
  }

  if (view === "value") {
    const mx = members.reduce((p, c) =>
      c.summaryValue > p.summaryValue ? c : p,
    )
    const mn = members.reduce((p, c) =>
      c.summaryValue < p.summaryValue ? c : p,
    )
    if (a.variableId === "gw_trend") {
      return [
        plain(`Groundwater levels decline fastest for `),
        strong(mn.label),
        plain(` (${withUnit(mn.summaryValue, unit)}) and are most stable for `),
        strong(mx.label),
        plain(` (${withUnit(mx.summaryValue, unit)}).`),
      ]
    }
    return [
      strong(mx.label),
      plain(` has the highest value (${withUnit(mx.summaryValue, unit)}); `),
      strong(mn.label),
      plain(` the lowest (${withUnit(mn.summaryValue, unit)}).`),
    ]
  }

  // Annual distribution (dist / pct). Use the box median, which reflects real
  // CalSim data when a member is file- or live-backed (the synthetic fallback
  // otherwise) — matching what the box / exceedance curve draws.
  const med = (m: ChartMember) => m.box.mid

  if (a.compareBy === "scen") {
    const ref = members.find((m) => m.scenarioId === a.baselineScenarioId) ?? m0
    const others = members.filter((m) => m !== ref)
    const segs: SummarySegment[] = [
      plain(`At `),
      strong(a.locationName),
      plain(` under the ${a.climateName} hydroclimate, median ${vn} for `),
      strong(ref.label),
      plain(` (the reference) is `),
      strong(withUnit(med(ref), unit)),
    ]
    if (others.length) {
      segs.push(plain(`; relative to it: `))
      others.forEach((m, i) => {
        if (i > 0) segs.push(plain(", "))
        segs.push(plain(`${m.label} `), deltaSeg(med(ref), med(m)))
      })
    }
    segs.push(plain("."))
    return segs
  }

  if (a.compareBy === "clim") {
    return [
      plain(`Under `),
      strong(a.scenarioName),
      plain(` at ${a.locationName}, median ${vn} goes from `),
      strong(withUnit(med(m0), unit)),
      plain(` (${m0.label}) to `),
      strong(withUnit(med(last), unit)),
      plain(` (${last.label}) — a change of `),
      deltaSeg(med(m0), med(last)),
      plain(`.`),
    ]
  }

  // compareBy === "loc"
  const mx = members.reduce((p, c) => (med(c) > med(p) ? c : p))
  const mn = members.reduce((p, c) => (med(c) < med(p) ? c : p))
  return [
    plain(`Under `),
    strong(a.scenarioName),
    plain(` (${a.climateName}), median ${vn} ranges from `),
    strong(withUnit(med(mn), unit)),
    plain(` at ${mn.label} to `),
    strong(withUnit(med(mx), unit)),
    plain(` at ${mx.label}.`),
  ]
}

/**
 * View-specific "How do I read this chart?" guidance. Ported from the
 * prototype's `howToRead`. `innerLabel` is the box's inner-band percentile
 * range (e.g. "25th–75th" synthetic/file, "30th–70th" live), so the box text
 * stays accurate when the box is real.
 */
export function howToRead(
  view: InDepthViewId,
  distKind: "exceed" | "box",
  nYears: number,
  innerLabel: string,
): string {
  if (view === "monthly")
    return `Each line is the median value for that month across all ${nYears} simulated years; the shaded band spans the 10th–90th percentile (8 of 10 years fall inside it). Months follow the water year (October–September).`
  if (view === "series")
    return `The raw monthly trace over the full ${nYears}-year simulation — every month plotted in sequence (${nYears}×12 values), in water-year order. Unlike the monthly pattern, nothing is averaged: you see the actual run, including the wet and dry stretches and how each scenario tracks through them. The horizontal axis is the simulation year.`
  if (view === "cv")
    return `The coefficient of variation (CV) is the year-to-year standard deviation divided by the mean. A CV of 0.10 means typical years vary about ±10% around the average; higher bars mean a less reliable, more boom-and-bust pattern.`
  if (view === "value")
    return `A single summary number per comparison member. Hover a bar for the exact value.`
  if (distKind === "box")
    return `Each box summarizes all ${nYears} simulated years: the heavy line is the median, the box spans the ${innerLabel} percentiles (the middle of the years), and the whiskers reach the 10th and 90th percentiles. Wider boxes = more year-to-year variability.`
  return `An exceedance plot answers: "in what share of years is the value at least this big?" Pick a point on a line: its horizontal position is the percent of years, the vertical position the value. The left side shows wet/abundant years, the right side dry/scarce years. Where one line sits above another, that alternative delivers more in that kind of year. Reading at 50% gives the median year; at 90%, a dry year exceeded 9 years in 10.`
}

/**
 * "Why is there no climate-vs-operations breakdown here?" — the concept #17
 * stance, ported verbatim (two paragraphs) from the prototype. Public-facing.
 */
export const NO_DECOMPOSITION_TEXT: string[] = [
  "Elsewhere on the site, results on the tier scale are shown in two steps: what climate change alone would do, and what a strategy adds or subtracts. That works for tiers because tiers are broad categories. The detailed numbers on this page don’t support the same split. The water system is full of hard limits — reservoirs fill or empty completely, deliveries can’t exceed contracts or fall below zero — so the effect of a strategy, measured in acre-feet or flow, depends on which climate it is measured under. The two pieces don’t add up to the total change, and a strategy can look ineffective simply because the system is pinned against a limit.",
  "So this page lets you change one thing at a time — compare strategies under the same climate, or climates under the same strategy — which the model genuinely supports. The missing breakdown is deliberate, not a gap.",
]

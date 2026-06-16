/**
 * In-Depth Outcomes — data-source seam.
 *
 * The chart components consume a single member shape (`ChartMember`) regardless
 * of where the numbers come from. This file defines that shape and the box
 * five-number summary, and provides the SYNTHETIC → LIVE swap for the families
 * that can be cleanly backed by the real `@repo/data` batch statistics today.
 *
 * Reality of the statistics API (confirmed against `@repo/data` types):
 *  - It returns PERCENTILES only, never the raw per-year series. So the
 *    exceedance curve (which needs the full sorted series) stays SYNTHETIC; only
 *    the box plot can be drawn from live data.
 *  - Storage percentiles are MONTHLY, keyed by water month (1 = Oct … 12 = Sep),
 *    with the set q0/q10/q30/q50/q70/q90/q100. The "annual" April / September
 *    storage distribution is exactly the April ("7") / September ("12") month
 *    bin, so reservoir storage maps cleanly. The reservoir keys (e.g. "SHSTA",
 *    "FOLSM") match the synthetic location ids.
 *  - Other families (ag / cws / flows) need invented location-id → real-key
 *    mappings and, for climate-compare, multi-hydroclimate fetches the single
 *    batch can't serve, so they stay synthetic for now (decision: light up
 *    reservoir storage first, extend family-by-family).
 *
 * Live wiring here is gated to the safe case — reservoir storage, scenario
 * compare, distribution/percent view — and falls back to synthetic everywhere
 * else. The live path is verified by type-checking and shape review here; it
 * must be confirmed in the running app against the real API.
 */

import type {
  BatchStatisticsResponse,
  MonthlyPercentiles,
  PercentileValues,
} from "@repo/data/coeqwal"
import type {
  InDepthVariableId,
  InDepthViewId,
} from "../config/inDepthVariables"
import type {
  MonthlyBand,
  SeriesStats,
} from "../synthetic/inDepthSyntheticEngine"
import type { CompareBy } from "../../../../store"

/** Where a member's numbers came from. "file" = precomputed CalSim sidecar. */
export type DataSource = "synthetic" | "live" | "file"

/** Five-number summary the box plot draws, plus a label for the inner band. */
export interface BoxStats {
  whiskerLo: number
  boxLo: number
  mid: number
  boxHi: number
  whiskerHi: number
  /** Human-readable inner-band percentiles, e.g. "25th–75th" or "30th–70th". */
  innerLabel: string
}

/** One line / box in a chart: its series (synthetic only), box, and provenance. */
export interface ChartMember {
  /** Stable key (scenario|climate|location). */
  key: string
  /** Legend label (the varying dimension's name). */
  label: string
  /** Member colour from the categorical palette. */
  color: string
  scenarioId: string
  climateId: string
  locationId: string
  /** Annual series; drives the exceedance curve (real when file-backed). */
  series: number[]
  /** Five-number summary for the box plot. */
  box: BoxStats
  /** Coefficient of variation of the annual series (year-to-year variability view). */
  cv: number
  /** Single summary value (e.g. gw_trend ft/yr, ag_rev $B) for the value view. */
  summaryValue: number
  /** Monthly p10/p50/p90 band (12 months) — populated for the monthly view only. */
  monthlyBands?: MonthlyBand[]
  /** Raw NYEARS×12 monthly trace — populated for the time-series view only. */
  monthlySeries?: number[]
  /** Where the numbers came from. Monthly views are always synthetic for now. */
  source: DataSource
}

/** Synthetic box from the engine's percentile stats (p10/p25/p50/p75/p90). */
export function syntheticBox(s: SeriesStats): BoxStats {
  return {
    whiskerLo: s.p10,
    boxLo: s.p25,
    mid: s.p50,
    boxHi: s.p75,
    whiskerHi: s.p90,
    innerLabel: "25th–75th",
  }
}

/** Live box from API percentile values (q10/q30/q50/q70/q90). */
export function liveBox(pv: PercentileValues): BoxStats {
  return {
    whiskerLo: pv.q10,
    boxLo: pv.q30,
    mid: pv.q50,
    boxHi: pv.q70,
    whiskerHi: pv.q90,
    innerLabel: "30th–70th",
  }
}

/** Water-month bin (1 = Oct … 12 = Sep) whose distribution is the annual value. */
const STORAGE_MONTH_BIN: Partial<Record<InDepthVariableId, string>> = {
  res_apr: "7", // April
  res_sep: "12", // September
}

/** Variables whose live box reads from the batch `storage` family. */
export function isLiveStorageVariable(variableId: InDepthVariableId): boolean {
  return variableId in STORAGE_MONTH_BIN
}

function reservoirPercentiles(
  batch: BatchStatisticsResponse,
  scenarioShortCode: string,
  reservoirId: string,
  pct: boolean,
): MonthlyPercentiles | null {
  const scenario = batch.storage?.[scenarioShortCode]
  if (!scenario) return null
  // Batch reservoirs are keyed by short id (e.g. "SHSTA"); tolerate the "S_" form.
  const reservoirs = scenario.reservoirs
  const entry =
    reservoirs[reservoirId] ?? reservoirs[`S_${reservoirId}`] ?? undefined
  if (!entry) return null
  return pct ? entry.monthly_percent : entry.monthly_taf
}

export interface LiveStorageContext {
  variableId: InDepthVariableId
  view: InDepthViewId
  compareBy: CompareBy
  /** sibling-group id → resolved scenario short_code (from useResolvedSelectedScenarios). */
  groupToShortCode: Record<string, string | null>
  batch: BatchStatisticsResponse | undefined
}

/**
 * Replace each eligible member's box with live reservoir-storage percentiles.
 * Returns a new array; members that can't be served keep their synthetic box.
 * Gated to reservoir storage + scenario-compare + distribution/percent view.
 */
export function applyLiveStorage(
  members: ChartMember[],
  ctx: LiveStorageContext,
): ChartMember[] {
  const eligibleView = ctx.view === "dist" || ctx.view === "pct"
  if (
    !ctx.batch ||
    ctx.compareBy !== "scen" ||
    !eligibleView ||
    !isLiveStorageVariable(ctx.variableId)
  ) {
    return members
  }
  const monthKey = STORAGE_MONTH_BIN[ctx.variableId]
  if (!monthKey) return members
  const pct = ctx.view === "pct"

  return members.map((m) => {
    if (m.source !== "synthetic") return m // a fuller source (file) already won
    const shortCode = ctx.groupToShortCode[m.scenarioId]
    if (!shortCode) return m
    const monthly = reservoirPercentiles(
      ctx.batch!,
      shortCode,
      m.locationId,
      pct,
    )
    const pv = monthly?.[monthKey]
    if (!pv) return m
    return { ...m, box: liveBox(pv), source: "live" }
  })
}

/** True when at least one member is showing live data. */
export function hasLiveMember(members: ChartMember[]): boolean {
  return members.some((m) => m.source === "live")
}

// ----------------------------------------------------------------------------
// Precomputed CalSim sidecar (file) source
//
// A sidecar holds the ANNUAL series the statistics API can't provide — one value
// per water year, reduced offline from the raw 280 MB CalSim CSV (see
// tools/extract_calsim_sidecar.py). Because it carries the full series, it powers
// BOTH the exceedance curve and the box from real data.
// ----------------------------------------------------------------------------

export interface CalsimSidecar {
  scenario: string
  startWaterYear: number
  nYears: number
  /** variableId -> locationId -> annual series (one value per water year). */
  series: Record<string, Record<string, number[]> | undefined>
}

function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  const a = sorted[lo] ?? 0
  const b = sorted[hi] ?? a
  return a + (b - a) * (i - lo)
}

/** Box five-number summary from a raw annual series (p10/p25/p50/p75/p90). */
export function boxFromSeries(series: number[]): BoxStats {
  const s = [...series].sort((a, b) => a - b)
  return {
    whiskerLo: quantileSorted(s, 0.1),
    boxLo: quantileSorted(s, 0.25),
    mid: quantileSorted(s, 0.5),
    boxHi: quantileSorted(s, 0.75),
    whiskerHi: quantileSorted(s, 0.9),
    innerLabel: "25th–75th",
  }
}

/** Coefficient of variation (sd / mean) of a series. */
export function cvOf(series: number[]): number {
  if (series.length === 0) return 0
  const mean = series.reduce((a, b) => a + b, 0) / series.length
  if (!mean) return 0
  const sd = Math.sqrt(
    series.reduce((a, b) => a + (b - mean) * (b - mean), 0) / series.length,
  )
  return sd / mean
}

/** Summary value from a real series: mean for ag_rev, median otherwise. */
export function summaryOf(
  variableId: InDepthVariableId,
  series: number[],
): number {
  if (series.length === 0) return NaN
  const s = [...series].sort((a, b) => a - b)
  if (variableId === "ag_rev") {
    return series.reduce((a, b) => a + b, 0) / series.length
  }
  return quantileSorted(s, 0.5)
}

export interface FileSeriesContext {
  variableId: InDepthVariableId
  view: InDepthViewId
  /** Loaded sidecars keyed by scenario code. */
  sidecars: Record<string, CalsimSidecar | undefined>
  /** Resolve a member's scenarioId to the sidecar code (direct, then group→short). */
  groupToShortCode: Record<string, string | null>
  /** Reservoir capacity (TAF) by location id, for the `pct` view. */
  capForLocation?: (locationId: string) => number | undefined
}

/**
 * Replace each member's series + box with the precomputed CalSim sidecar where
 * available. Carries the full annual series, so the exceedance curve becomes
 * real too. Members without sidecar coverage keep their synthetic numbers.
 */
export function applyFileSeries(
  members: ChartMember[],
  ctx: FileSeriesContext,
): ChartMember[] {
  // Sidecars carry annual series only; monthly views stay synthetic for now.
  const annualView =
    ctx.view === "dist" ||
    ctx.view === "pct" ||
    ctx.view === "cv" ||
    ctx.view === "value"
  if (!annualView) return members
  const pct = ctx.view === "pct"
  return members.map((m) => {
    const code = ctx.sidecars[m.scenarioId]
      ? m.scenarioId
      : (ctx.groupToShortCode[m.scenarioId] ?? "")
    const sidecar = code ? ctx.sidecars[code] : undefined
    const raw = sidecar?.series[ctx.variableId]?.[m.locationId]
    if (!raw || raw.length === 0) return m
    let series = raw
    if (pct) {
      const cap = ctx.capForLocation?.(m.locationId)
      if (cap && cap > 0) series = raw.map((v) => (v / cap) * 100)
    }
    return {
      ...m,
      series,
      box: boxFromSeries(series),
      cv: cvOf(series),
      summaryValue: summaryOf(ctx.variableId, series),
      source: "file",
    }
  })
}

/** Scenario codes a sidecar might exist for, given the current selection. */
export function sidecarCodes(
  selectedScenarioIds: string[],
  resolvedIds: string[],
  pinnedScenarioId: string,
): string[] {
  const isCode = (id: string) => /^s\d+$/.test(id)
  const set = new Set<string>()
  for (const id of selectedScenarioIds) if (isCode(id)) set.add(id)
  for (const id of resolvedIds) set.add(id)
  if (isCode(pinnedScenarioId)) set.add(pinnedScenarioId)
  return [...set]
}

/** True when at least one member is showing precomputed file data. */
export function hasFileMember(members: ChartMember[]): boolean {
  return members.some((m) => m.source === "file")
}

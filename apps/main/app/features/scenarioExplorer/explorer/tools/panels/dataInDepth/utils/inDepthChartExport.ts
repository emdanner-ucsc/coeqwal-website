/**
 * In-Depth Outcomes — chart export (CSV + SVG).
 *
 * Build-order step 5. Turns whatever the Data Explorer is currently showing
 * into two downloadable artefacts:
 *
 *  - a CSV of the *plotted* numbers (what each chart view actually draws), with
 *    a small header block recording the variable, view, comparison axis, units
 *    and — important for this tool — whether each member's numbers are real
 *    CalSim 3 output or the synthetic stand-in;
 *  - the chart itself as a standalone SVG.
 *
 * Both lean on helpers that already live in `exportUtils.ts`
 * (`downloadCSV`, `downloadSvgString`, `composeLiveSvgsToString`,
 * `embedFontStylesInSvg`). This file only adds the data-in-depth-specific
 * serialisation; it does not reimplement the download or SVG plumbing.
 *
 * NOTE FOR THE REACT DEVELOPER PICKING THIS UP: the CSV is built per view from
 * the in-memory `ChartMember[]` the chart received, so it always matches the
 * picture on screen (real where the member is real, synthetic where it isn't).
 * If the underlying member shape changes, the per-view branches in
 * `buildMembersCsv` are the only thing to revisit.
 */

import type { ChartMember, DataSource } from "../data/inDepthDataSource"
import type {
  InDepthVariableId,
  InDepthViewId,
} from "../config/inDepthVariables"
import {
  composeLiveSvgsToString,
  downloadCSV,
  downloadSvgString,
  embedFontStylesInSvg,
  getTimestampedFilename,
} from "./exportUtils"

/** Water-year month labels, month 0 = October (CalSim water-year order). */
const WATER_MONTH_LABELS = [
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
] as const

/** Human-readable provenance for the CSV's per-member source column. */
const SOURCE_LABEL: Record<DataSource, string> = {
  file: "Real CalSim 3 (precomputed from raw output)",
  live: "Live CalSim 3 statistics",
  synthetic: "Synthetic stand-in",
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

/** Round to a fixed number of decimals, dropping the value when not finite. */
function num(v: number | undefined, dp = 3): string {
  if (v == null || !Number.isFinite(v)) return ""
  return String(Math.round(v * 10 ** dp) / 10 ** dp)
}

export interface MembersCsvInput {
  variableName: string
  variableId: InDepthVariableId
  view: InDepthViewId
  viewLabel: string
  /** "Exceedance" | "Box plot" — only meaningful for the distribution views. */
  distKind?: "exceed" | "box"
  compareByLabel: string
  /** Axis unit for the plotted values (already "%" for the pct view). */
  unit: string
  members: ChartMember[]
}

/**
 * Render the shared key,value preamble that sits at the top of every export.
 * Records what was on screen so a downloaded CSV is self-describing.
 */
function headerBlock(input: MembersCsvInput): string[] {
  const isDist = input.view === "dist" || input.view === "pct"
  const viewCell =
    isDist && input.distKind
      ? `${input.viewLabel} — ${input.distKind === "box" ? "Box plot" : "Exceedance"}`
      : input.viewLabel
  const rows: string[] = [
    `COEQWAL data export,${csvEscape(input.variableName)}`,
    `Variable id,${csvEscape(input.variableId)}`,
    `View,${csvEscape(viewCell)}`,
    `Compare by,${csvEscape(input.compareByLabel)}`,
    `Units,${csvEscape(input.unit)}`,
    `Generated,${new Date().toISOString()}`,
  ]
  // Provenance: list each plotted member and whether it is real or synthetic.
  rows.push("")
  rows.push("Member,Data source")
  for (const m of input.members) {
    rows.push(`${csvEscape(m.label)},${csvEscape(SOURCE_LABEL[m.source])}`)
  }
  return rows
}

/** Annual series as a wide table: one row per year index, one column per member. */
function annualSeriesTable(members: ChartMember[]): string[] {
  const maxLen = members.reduce((n, m) => Math.max(n, m.series.length), 0)
  const lines: string[] = []
  lines.push(
    ["Year index", ...members.map((m) => csvEscape(m.label))].join(","),
  )
  for (let i = 0; i < maxLen; i++) {
    const cells = members.map((m) => num(m.series[i]))
    lines.push([String(i + 1), ...cells].join(","))
  }
  return lines
}

/** Five-number summary table — what the box plot actually draws. */
function boxSummaryTable(members: ChartMember[]): string[] {
  const innerLabel = members[0]?.box.innerLabel ?? "inner band"
  const lines: string[] = []
  lines.push(`Box inner band,${csvEscape(innerLabel)} percentiles`)
  lines.push("")
  lines.push(
    [
      "Member",
      "Whisker low (10th)",
      "Box low",
      "Median",
      "Box high",
      "Whisker high (90th)",
    ].join(","),
  )
  for (const m of members) {
    lines.push(
      [
        csvEscape(m.label),
        num(m.box.whiskerLo),
        num(m.box.boxLo),
        num(m.box.mid),
        num(m.box.boxHi),
        num(m.box.whiskerHi),
      ].join(","),
    )
  }
  return lines
}

/** Single value per member (CV view, or summary-value view). */
function singleValueTable(
  members: ChartMember[],
  columnLabel: string,
  pick: (m: ChartMember) => number,
): string[] {
  const lines: string[] = []
  lines.push(["Member", csvEscape(columnLabel)].join(","))
  for (const m of members) {
    lines.push([csvEscape(m.label), num(pick(m))].join(","))
  }
  return lines
}

/** Monthly climatology band: long format, one row per member × water-month. */
function monthlyBandTable(members: ChartMember[]): string[] {
  const lines: string[] = []
  lines.push(["Member", "Water month", "p10", "p50", "p90"].join(","))
  for (const m of members) {
    const bands = m.monthlyBands ?? []
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i]!
      lines.push(
        [
          csvEscape(m.label),
          WATER_MONTH_LABELS[i] ?? String(i + 1),
          num(b.p10),
          num(b.p50),
          num(b.p90),
        ].join(","),
      )
    }
  }
  return lines
}

/** Raw monthly time series: long format, one row per member × month. */
function monthlySeriesTable(members: ChartMember[]): string[] {
  const lines: string[] = []
  lines.push(["Member", "Sim year", "Water month", "Value"].join(","))
  for (const m of members) {
    const trace = m.monthlySeries ?? []
    for (let i = 0; i < trace.length; i++) {
      const simYear = Math.floor(i / 12) + 1
      const monthLabel = WATER_MONTH_LABELS[i % 12] ?? String((i % 12) + 1)
      lines.push(
        [csvEscape(m.label), String(simYear), monthLabel, num(trace[i])].join(
          ",",
        ),
      )
    }
  }
  return lines
}

/**
 * Build the CSV for whatever the explorer is currently showing. The data table
 * is chosen to match the view: the annual series behind the exceedance curve,
 * the five-number summary behind the box plot, a single value per member for
 * the bar views, and long-format monthly tables for the two monthly views.
 */
export function buildMembersCsv(input: MembersCsvInput): string {
  const lines = [...headerBlock(input), ""]

  let table: string[]
  switch (input.view) {
    case "dist":
    case "pct":
      // Box mode plots the summary (and a live box has no real series), so it
      // is serialised from the five-number summary; exceedance plots the series.
      table =
        input.distKind === "box"
          ? boxSummaryTable(input.members)
          : annualSeriesTable(input.members)
      break
    case "cv":
      table = singleValueTable(
        input.members,
        "Year-to-year variability (CV %)",
        (m) => m.cv * 100,
      )
      break
    case "value":
      table = singleValueTable(
        input.members,
        `Summary value (${input.unit})`,
        (m) => m.summaryValue,
      )
      break
    case "monthly":
      table = monthlyBandTable(input.members)
      break
    case "series":
      table = monthlySeriesTable(input.members)
      break
    default:
      table = annualSeriesTable(input.members)
  }

  return [...lines, ...table].join("\n")
}

/** Stable base filename (no extension) for a given export. */
function baseFilename(input: {
  variableId: InDepthVariableId
  view: InDepthViewId
  distKind?: "exceed" | "box"
}): string {
  const isDist = input.view === "dist" || input.view === "pct"
  const suffix = isDist && input.distKind ? `-${input.distKind}` : ""
  return `coeqwal-data-${input.variableId}-${input.view}${suffix}`
}

/** Build + download the current view's plotted members as a CSV file. */
export function downloadMembersCsv(input: MembersCsvInput): void {
  const csv = buildMembersCsv(input)
  downloadCSV(csv, getTimestampedFilename(baseFilename(input), "csv"))
}

/**
 * Serialise the chart's on-screen SVG(s) to a standalone SVG string and
 * download it. `composeLiveSvgsToString` walks every `<svg>` under `host`, so
 * this handles the single-SVG charts and the monthly small-multiples (many
 * SVGs) identically. Fonts are embedded best-effort via `embedFontStylesInSvg`.
 */
export function downloadChartSvg(
  host: HTMLElement,
  fileBase: {
    variableId: InDepthVariableId
    view: InDepthViewId
    distKind?: "exceed" | "box"
  },
): void {
  const svgString = embedFontStylesInSvg(composeLiveSvgsToString(host))
  downloadSvgString(
    svgString,
    getTimestampedFilename(baseFilename(fileBase), "svg"),
  )
}

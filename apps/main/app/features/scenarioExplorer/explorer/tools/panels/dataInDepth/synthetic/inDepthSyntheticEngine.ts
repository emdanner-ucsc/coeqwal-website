/**
 * In-Depth Outcomes — deterministic SYNTHETIC data engine + fixtures.
 *
 * Ported verbatim (logic-for-logic) from the data-in-depth prototype
 * (projects/coeqwal-prototypes/data-in-depth). This is the Option A decision #2
 * "build on synthetic first" engine: a seeded, deterministic generator that
 * stands in for the real `@repo/data` hooks until they are wired family-by-
 * family. NOTHING here is real CalSim output — every number is illustrative.
 *
 * The scenario / climate / location fixtures and the per-variable base
 * magnitudes live here (not in the editorial config) because they are data, not
 * definitions. The editorial KINDS / SHAPES tuning tables are imported from the
 * config so there is a single source of truth for them.
 */

import {
  KINDS,
  SHAPES,
  VARDEF,
  type InDepthKindId,
  type InDepthVariableId,
  type LocationGroupId,
  type ShapeId,
} from "../config/inDepthVariables"

// ----------------------------------------------------------------------------
// Fixtures (SYNTHETIC)
// ----------------------------------------------------------------------------

export interface SyntheticClimate {
  id: string
  name: string
  /** 0 (historical) → 1 (extreme); drives the climate response. */
  stress: number
  desc: string
}

export const CLIMATES: SyntheticClimate[] = [
  {
    id: "hist",
    name: "Historical",
    stress: 0.0,
    desc: "Historical temperature and precipitation over Central Valley inflow basins (DWR DCR2023 baseline).",
  },
  {
    id: "mod",
    name: "Moderate risk",
    stress: 0.15,
    desc: "+1.2 °C, somewhat wetter (LOCA2 EC-Earth3-Veg SSP370; 44% level-of-concern).",
  },
  {
    id: "modhigh",
    name: "Moderate-high risk",
    stress: 0.4,
    desc: "+1.5 °C, −1.5% precipitation (DWR WGEN 50th percentile level-of-concern, CC50).",
  },
  {
    id: "high",
    name: "High risk",
    stress: 0.7,
    desc: "+1.8 °C, slight precipitation decline (DWR WGEN 95th percentile level-of-concern, CC95).",
  },
  {
    id: "extreme",
    name: "Extreme risk",
    stress: 1.0,
    desc: "+1.9 °C, −7.2% precipitation (LOCA2 TaiESM1 SSP370).",
  },
]

export interface SyntheticTheme {
  id: string
  name: string
}

export const THEMES: SyntheticTheme[] = [
  { id: "cur", name: "Current operations" },
  { id: "cws", name: "Community water supplies" },
  { id: "farm", name: "Farms and groundwater" },
  { id: "salmon", name: "Rivers and salmon" },
  { id: "delta", name: "The Delta" },
]

export interface SyntheticScenario {
  id: string
  theme: string
  name: string
  /** True for the Current-operations baseline (s0020). */
  base?: boolean
  /** Effect concentrated South of Delta when true. */
  sod?: boolean
  /** Fractional shifts vs. Current operations, by effect family. */
  eff: Record<string, number>
  desc: string
}

export const SCENARIOS: SyntheticScenario[] = [
  {
    id: "s0020",
    theme: "cur",
    name: "Current operations",
    base: true,
    eff: {},
    desc: "Existing operational rules for Central Valley water allocations (DWR benchmark).",
  },
  {
    id: "s0011",
    theme: "cur",
    name: "Current ops · historical land use",
    eff: { agDel: 0.02, gwStor: 0.03 },
    desc: "Current operations with historical land use assumptions.",
  },
  {
    id: "s0021",
    theme: "cur",
    name: "Current ops · no TUCPs",
    eff: { storage: -0.04, outflow: 0.05, exports: -0.05, sal: -0.04 },
    desc: "Current operations without Temporary Urgency Change Petitions in dry years.",
  },
  {
    id: "s0024",
    theme: "cur",
    name: "Current USBR operations",
    eff: { exports: 0.04, storage: -0.02, flows: -0.03 },
    desc: "Existing operational rules as specified by USBR (LTO Alt 2).",
  },
  {
    id: "s0023",
    theme: "cur",
    name: "Current USBR ops · no TUCPs",
    eff: { exports: -0.02, outflow: 0.04, sal: -0.03, storage: -0.04 },
    desc: "USBR operations without TUCPs.",
  },
  {
    id: "s0035",
    theme: "cws",
    name: "Prioritize CWS human-health deliveries",
    eff: { cws: 0.15, cwsShort: -0.45, agDel: -0.03 },
    desc: "Deliveries meeting human health and safety needs of community water systems are prioritized.",
  },
  {
    id: "s0037",
    theme: "cws",
    name: "Prioritize full CWS demands",
    eff: { cws: 0.3, cwsShort: -0.65, agDel: -0.08, storage: -0.03 },
    desc: "Deliveries meeting full contract/demand levels of community water systems are prioritized.",
  },
  {
    id: "s0025",
    theme: "farm",
    name: "GW pumping limits · San Joaquin Valley",
    sod: true,
    eff: { pump: -0.3, short: 0.45, rev: -0.07, gwStor: 0.15, gwTrend: 0.6 },
    desc: "Groundwater pumping limits applied to farms in the San Joaquin Valley (SGMA-like).",
  },
  {
    id: "s0026",
    theme: "farm",
    name: "GW limits + reduced crops · SJV",
    sod: true,
    eff: {
      pump: -0.35,
      agDel: -0.12,
      short: 0.2,
      rev: -0.11,
      gwStor: 0.2,
      gwTrend: 0.7,
    },
    desc: "SJV pumping limits with projected reductions in crop acreage.",
  },
  {
    id: "s0027",
    theme: "farm",
    name: "GW pumping limits · Central Valley",
    eff: { pump: -0.35, short: 0.5, rev: -0.09, gwStor: 0.2, gwTrend: 0.7 },
    desc: "Pumping limits applied throughout the Sacramento and San Joaquin Valleys.",
  },
  {
    id: "s0028",
    theme: "farm",
    name: "GW limits + reduced crops · CV",
    eff: {
      pump: -0.4,
      agDel: -0.15,
      short: 0.25,
      rev: -0.13,
      gwStor: 0.25,
      gwTrend: 0.8,
    },
    desc: "Central Valley pumping limits with reduced crop acreage.",
  },
  {
    id: "s0030",
    theme: "salmon",
    name: "No flow requirements",
    eff: {
      flows: -0.3,
      exports: 0.12,
      agDel: 0.1,
      storage: 0.08,
      outflow: -0.15,
      sal: 0.1,
      pctUIF: -0.2,
    },
    desc: "Current operations without minimum flow requirements on Central Valley rivers.",
  },
  {
    id: "s0046",
    theme: "salmon",
    name: "Functional environmental flows",
    eff: {
      flows: 0.3,
      exports: -0.12,
      agDel: -0.1,
      storage: -0.05,
      outflow: 0.12,
      sal: -0.06,
      pctUIF: 0.25,
    },
    desc: "Functional flow requirements implemented on tributaries to the Sacramento and San Joaquin Rivers.",
  },
  {
    id: "s0032",
    theme: "salmon",
    name: "Functional flows + GW regulations",
    eff: {
      flows: 0.32,
      exports: -0.15,
      agDel: -0.12,
      pump: -0.3,
      rev: -0.1,
      gwStor: 0.2,
      gwTrend: 0.7,
      pctUIF: 0.27,
      short: 0.3,
    },
    desc: "Functional flow requirements combined with groundwater pumping regulations.",
  },
  {
    id: "s0031",
    theme: "salmon",
    name: "Salmon-friendly flows",
    eff: {
      flows: 0.22,
      storage: 0.06,
      sepBonus: 0.1,
      exports: -0.1,
      agDel: -0.08,
      pctUIF: 0.15,
    },
    desc: "Sacramento River flow requirements and Shasta cold-water storage protection for winter-run Chinook.",
  },
  {
    id: "s0033",
    theme: "salmon",
    name: "Salmon flows + GW regulations",
    eff: {
      flows: 0.24,
      storage: 0.06,
      sepBonus: 0.1,
      exports: -0.12,
      pump: -0.3,
      rev: -0.09,
      gwStor: 0.2,
      gwTrend: 0.7,
      pctUIF: 0.17,
      short: 0.3,
    },
    desc: "Salmon-friendly flows combined with groundwater pumping regulations.",
  },
  {
    id: "s0040",
    theme: "delta",
    name: "Reduce Delta outflows (35% UF)",
    eff: { outflow: -0.15, exports: 0.12, sal: 0.12, pctUIF: -0.18 },
    desc: "USBR LTO Alt 3 strategy targeting 35% of unimpaired Delta outflow.",
  },
  {
    id: "s0041",
    theme: "delta",
    name: "Maintain Delta outflows (45% UF)",
    eff: { outflow: 0.02, exports: 0.02, pctUIF: 0.02 },
    desc: "USBR LTO Alt 3 strategy targeting 45% of unimpaired Delta outflow.",
  },
  {
    id: "s0042",
    theme: "delta",
    name: "Increase Delta outflows (55% UF)",
    eff: { outflow: 0.15, exports: -0.13, sal: -0.08, pctUIF: 0.2 },
    desc: "USBR LTO Alt 3 strategy targeting 55% of unimpaired Delta outflow.",
  },
  {
    id: "s0039",
    theme: "delta",
    name: "Increase Delta outflows (65% UF)",
    eff: {
      outflow: 0.3,
      exports: -0.27,
      sal: -0.15,
      pctUIF: 0.42,
      storage: -0.07,
      agDel: -0.1,
    },
    desc: "USBR LTO Alt 3 strategy targeting 65% of unimpaired Delta outflow.",
  },
  {
    id: "s0044",
    theme: "delta",
    name: "Increase Shasta carryover storage",
    eff: { storage: 0.1, sepBonus: 0.12, exports: -0.05, agDel: -0.04 },
    desc: "Year-to-year storage carryover target increased by 20%.",
  },
  {
    id: "s0045",
    theme: "delta",
    name: "Relax Delta salinity standards",
    eff: { sal: 0.2, exports: 0.08, outflow: -0.1, cws: -0.03 },
    desc: "Removes the fall (X2) salinity standard in the Delta, based on current USBR operations.",
  },
  {
    id: "s0065",
    theme: "delta",
    name: "Delta Conveyance Project",
    eff: { exports: 0.1, outflow: -0.04, sal: 0.03, cws: 0.05 },
    desc: "DWR's 2025 Delta Conveyance Project scenario, with current land use.",
  },
]

export interface SyntheticLocation {
  id: string
  /** Display name. */
  n: string
  region: string
  /** Reservoir capacity (TAF); used by storage variables + `pct` view. */
  cap?: number
  /** Synthetic median magnitude for non-reservoir groups. */
  base?: number
  /** Aggregate (roll-up) location. */
  agg?: boolean
}

export interface SyntheticLocationGroup {
  label: string
  items: SyntheticLocation[]
}

export const LOCGROUPS: Record<LocationGroupId, SyntheticLocationGroup> = {
  reservoirs: {
    label: "Reservoir",
    items: [
      { id: "SHSTA", n: "Shasta", region: "NOD", cap: 4552 },
      { id: "OROVL", n: "Oroville", region: "NOD", cap: 3425 },
      { id: "TRNTY", n: "Trinity", region: "NOD", cap: 2448 },
      { id: "FOLSM", n: "Folsom", region: "NOD", cap: 977 },
      { id: "MELON", n: "New Melones", region: "SOD", cap: 2400 },
      { id: "MLRTN", n: "Millerton", region: "SOD", cap: 520 },
      { id: "SLCVP", n: "San Luis (CVP)", region: "SOD", cap: 972 },
      { id: "SLSWP", n: "San Luis (SWP)", region: "SOD", cap: 1067 },
      {
        id: "AGG_NOD",
        n: "All North-of-Delta",
        region: "NOD",
        cap: 11402,
        agg: true,
      },
      {
        id: "AGG_SOD",
        n: "All South-of-Delta",
        region: "SOD",
        cap: 4959,
        agg: true,
      },
    ],
  },
  basins: {
    label: "Groundwater basin (WBA)",
    items: [
      { id: "COL", n: "Colusa", region: "NOD", base: 21000 },
      { id: "SUT", n: "Sutter", region: "NOD", base: 9500 },
      { id: "YOL", n: "Yolo", region: "NOD", base: 8200 },
      { id: "AMR", n: "American Basin", region: "NOD", base: 7400 },
      { id: "ESJ", n: "Eastern San Joaquin", region: "SOD", base: 16500 },
      { id: "MOD", n: "Modesto", region: "SOD", base: 6800 },
      { id: "TUR", n: "Turlock", region: "SOD", base: 7900 },
      { id: "MER", n: "Merced", region: "SOD", base: 9800 },
    ],
  },
  rivers: {
    label: "River location (LOI)",
    items: [
      {
        id: "SAC049",
        n: "Sacramento R. at Freeport",
        region: "NOD",
        base: 16000,
      },
      {
        id: "SAC000",
        n: "Sac–San Joaquin confluence",
        region: "NOD",
        base: 18200,
      },
      { id: "FTR029", n: "Feather R. below Yuba", region: "NOD", base: 4100 },
      { id: "AMR004", n: "American River", region: "NOD", base: 2600 },
      { id: "YRS", n: "Yuba River", region: "NOD", base: 2250 },
      { id: "SJR070", n: "San Joaquin River", region: "SOD", base: 3400 },
      { id: "TLG", n: "Tuolumne River", region: "SOD", base: 1750 },
      { id: "MRC", n: "Merced River", region: "SOD", base: 960 },
      { id: "MKM", n: "Mokelumne River", region: "SOD", base: 710 },
    ],
  },
  stations: {
    label: "Delta station",
    items: [
      { id: "EMM", n: "Emmaton", region: "Delta", base: 1500 },
      { id: "JP", n: "Jersey Point", region: "Delta", base: 900 },
      { id: "BANKS", n: "Banks", region: "Delta", base: 450 },
      { id: "JONES", n: "Jones", region: "Delta", base: 480 },
    ],
  },
  delta: {
    label: "Location",
    items: [
      { id: "DELTA", n: "Delta (NDO node)", region: "Delta", base: 13000 },
    ],
  },
  sysregions: {
    label: "Region",
    items: [
      { id: "SYS", n: "System-wide", region: "ALL", base: 1 },
      { id: "NOD", n: "North of Delta", region: "NOD", base: 0.38 },
      { id: "SOD", n: "South of Delta", region: "SOD", base: 0.62 },
    ],
  },
  agregions: {
    label: "Region (demand-unit group)",
    items: [
      { id: "AG_SAC", n: "Sacramento Valley DUs", region: "NOD", base: 1 },
      { id: "AG_SJV", n: "San Joaquin Valley DUs", region: "SOD", base: 1 },
      { id: "AG_TUL", n: "Tulare Basin DUs", region: "SOD", base: 1 },
      {
        id: "AG_ALL",
        n: "All Central Valley DUs",
        region: "ALL",
        base: 1,
        agg: true,
      },
    ],
  },
  cws: {
    label: "Community water system group",
    items: [
      {
        id: "CWS_SACU",
        n: "Sacramento-area systems",
        region: "NOD",
        base: 380,
      },
      { id: "CWS_BAY", n: "Bay Area contractors", region: "Delta", base: 520 },
      {
        id: "CWS_CVS",
        n: "Small Central Valley systems",
        region: "SOD",
        base: 140,
      },
      {
        id: "CWS_SOC",
        n: "Southern California contractors",
        region: "SOD",
        base: 1900,
      },
    ],
  },
}

/** Per-demand-unit-group base magnitudes for the agricultural variables. */
const AGBASE: Record<
  string,
  { del: number; pump: number; short: number; shortpct: number; rev: number }
> = {
  AG_SAC: { del: 5200, pump: 2300, short: 620, shortpct: 7, rev: 9.2 },
  AG_SJV: { del: 4600, pump: 5600, short: 980, shortpct: 11, rev: 14.8 },
  AG_TUL: { del: 2400, pump: 4400, short: 760, shortpct: 12, rev: 12.4 },
  AG_ALL: { del: 12200, pump: 12300, short: 2360, shortpct: 10, rev: 36.4 },
}

/** Okabe–Ito categorical palette for legend members. */
export const MEMBER_PALETTE = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#CC79A7",
  "#D55E00",
  "#56B4E9",
  "#8B7355",
  "#444444",
]

// ----------------------------------------------------------------------------
// Lookups
// ----------------------------------------------------------------------------

export const findScenario = (id: string): SyntheticScenario | undefined =>
  SCENARIOS.find((s) => s.id === id)
export const findClimate = (id: string): SyntheticClimate | undefined =>
  CLIMATES.find((c) => c.id === id)
export const findLocation = (
  group: LocationGroupId,
  id: string,
): SyntheticLocation | undefined =>
  LOCGROUPS[group].items.find((l) => l.id === id)

/** Default reference location for a group (first aggregate, else first item). */
export const defaultLocationId = (group: LocationGroupId): string => {
  const items = LOCGROUPS[group].items
  return (items.find((l) => l.agg) ?? items[0])?.id ?? ""
}

/** Per-variable synthetic base magnitude at a location. */
function baseMagnitude(
  variableId: InDepthVariableId,
  loc: SyntheticLocation,
): number {
  switch (variableId) {
    case "res_apr":
      return (loc.cap ?? 0) * 0.72
    case "res_sep":
      return (loc.cap ?? 0) * 0.45
    case "x2_apr":
      return 74
    case "x2_sep":
      return 84
    case "cvp_del":
      return 5000 * (loc.base ?? 0)
    case "swp_del":
      return 2600 * (loc.base ?? 0)
    case "tot_exp":
      return 4800
    case "ndo_uif":
      return 42
    case "riv_uif":
      return 38
    case "ag_del":
    case "ag_pump":
    case "ag_short":
    case "ag_shortpct":
    case "ag_rev": {
      const ag = AGBASE[loc.id]
      if (!ag) return 0
      if (variableId === "ag_del") return ag.del
      if (variableId === "ag_pump") return ag.pump
      if (variableId === "ag_short") return ag.short
      if (variableId === "ag_shortpct") return ag.shortpct
      return ag.rev
    }
    case "cws_short":
      return (loc.base ?? 0) * 0.06
    // gw_vol, station_ec, ndo, riv_flow, cws_del use the location's own base
    default:
      return loc.base ?? 1
  }
}

// ----------------------------------------------------------------------------
// Deterministic RNG (seeded by content hash; ported verbatim)
// ----------------------------------------------------------------------------

const NYEARS = 100

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(r: () => number): number {
  let u = 0
  let v = 0
  while (!u) u = r()
  while (!v) v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const yearFactorCache: Record<string, number[]> = {}
/** Shared hydrologic year-factor trace per climate (droughts cluster). */
function yearFactors(clim: SyntheticClimate): number[] {
  const cached = yearFactorCache[clim.id]
  if (cached) return cached
  const r = rng(hash("hydro|" + clim.id))
  const out: number[] = []
  let prev = 0
  for (let i = 0; i < NYEARS; i++) {
    const g = 0.55 * prev + Math.sqrt(1 - 0.55 * 0.55) * gauss(r)
    prev = g
    out.push(Math.exp(0.42 * (1 + 0.25 * clim.stress) * g - 0.5 * 0.42 * 0.42))
  }
  yearFactorCache[clim.id] = out
  return out
}

function regionWeight(scen: SyntheticScenario, loc: SyntheticLocation): number {
  if (!scen.sod) return 1
  if (loc.region === "SOD") return 1
  if (loc.region === "ALL") return 0.6
  return 0.2
}

function effectFor(
  variableId: InDepthVariableId,
  scen: SyntheticScenario,
  loc: SyntheticLocation,
): number {
  const vd = VARDEF[variableId]
  let e = (scen.eff[vd.effectFamily] ?? 0) * regionWeight(scen, loc)
  if (vd.useSepBonus && scen.eff.sepBonus) e += scen.eff.sepBonus
  return e
}

// ----------------------------------------------------------------------------
// Annual series + statistics
// ----------------------------------------------------------------------------

const seriesCache: Record<string, number[]> = {}

/** Deterministic annual series (NYEARS values) for a variable/scenario/climate/location. */
export function annualSeries(
  variableId: InDepthVariableId,
  scenarioId: string,
  climateId: string,
  locationId: string,
): number[] {
  const key = [variableId, scenarioId, climateId, locationId].join("|")
  const cached = seriesCache[key]
  if (cached) return cached

  const vd = VARDEF[variableId]
  const scen = findScenario(scenarioId)
  const clim = findClimate(climateId)
  const loc = findLocation(vd.locationGroupId, locationId)
  if (!scen || !clim || !loc) {
    seriesCache[key] = []
    return []
  }

  const kind: (typeof KINDS)[InDepthKindId] = KINDS[vd.kindId]
  const yf = yearFactors(clim)
  const m =
    baseMagnitude(variableId, loc) *
    (1 + effectFor(variableId, scen, loc)) *
    (1 + kind.clim * clim.stress)
  const r = rng(hash("noise|" + key))
  const sigma = kind.cv0 * (1 + kind.cvS * clim.stress) * 0.55
  const out: number[] = []
  for (let i = 0; i < NYEARS; i++) {
    let v =
      m *
      Math.pow(yf[i] ?? 1, kind.sens) *
      Math.exp(sigma * gauss(r) - 0.5 * sigma * sigma)
    if (kind.clamp) v = Math.min(kind.clamp[1], Math.max(kind.clamp[0], v))
    else v = Math.max(0, v)
    out.push(v)
  }
  seriesCache[key] = out
  return out
}

export interface SeriesStats {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  mean: number
  cv: number
}

function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  const vlo = sorted[lo] ?? 0
  const vhi = sorted[hi] ?? vlo
  return vlo + (vhi - vlo) * (i - lo)
}

export function stats(arr: number[]): SeriesStats {
  const s = [...arr].sort((a, b) => a - b)
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const sd = Math.sqrt(
    arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length,
  )
  return {
    p10: quantile(s, 0.1),
    p25: quantile(s, 0.25),
    p50: quantile(s, 0.5),
    p75: quantile(s, 0.75),
    p90: quantile(s, 0.9),
    mean,
    cv: mean ? sd / mean : 0,
  }
}

/** Seasonal shape for a variable (used by monthly views; here for completeness). */
export function shapeFor(variableId: InDepthVariableId): number[] {
  const kind = KINDS[VARDEF[variableId].kindId]
  const name: ShapeId | null =
    kind.shape ?? (VARDEF[variableId].kindId === "storage" ? "storage" : null)
  return SHAPES[name ?? "flow"]
}

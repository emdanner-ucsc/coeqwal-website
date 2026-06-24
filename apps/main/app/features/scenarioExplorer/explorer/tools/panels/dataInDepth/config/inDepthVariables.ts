/**
 * In-Depth Outcomes — variable, sector, view and synthetic-kind definitions.
 *
 * Ported from the data-in-depth prototype
 * (projects/coeqwal-prototypes/data-in-depth) per the port mapping §4. This
 * file holds the EDITORIAL definitions only: what each variable is, which
 * sector and location group it belongs to, which views it offers, and its
 * plain-language / technical descriptions. It carries no real data.
 *
 * SYNTHETIC NOTE (Option A decision #2 — build on synthetic data first):
 * `kindId` together with the KINDS and SHAPES tables tunes the prototype's
 * deterministic synthetic engine. They live here as config per the mapping and
 * are consumed by the synthetic adapter until real `@repo/data` hooks replace
 * them family-by-family. The per-variable base magnitudes (the prototype's
 * `base` lambdas) and the scenario / climate / location fixtures belong with
 * the synthetic adapter, not in this editorial config.
 */

// ----------------------------------------------------------------------------
// Identifiers
// ----------------------------------------------------------------------------

/** Sectors shown in the left rail (one accordion group each). */
export type InDepthSectorId =
  | "res"
  | "gw"
  | "salin"
  | "sysdel"
  | "outflow"
  | "eflows"
  | "ag"
  | "cwsS"
  | "salmonS"

/** Chart views a variable can offer. Keys index VIEW_META. */
export type InDepthViewId =
  | "dist"
  | "pct"
  | "monthly"
  | "series"
  | "cv"
  | "value"

/** Synthetic-engine response family. Keys index KINDS. */
export type InDepthKindId =
  | "storage"
  | "gwstor"
  | "flow"
  | "outflow"
  | "sal"
  | "x2"
  | "exports"
  | "agdel"
  | "pump"
  | "short"
  | "shortpct"
  | "rev"
  | "cwsdel"
  | "pctuif"

/** Location group a variable is reported over. Lists come from hooks (§4);
 *  the grouping ids and labels are config. */
export type LocationGroupId =
  | "reservoirs"
  | "basins"
  | "rivers"
  | "stations"
  | "delta"
  | "sysregions"
  | "agregions"
  | "cws"

/** Variable ids — one row group of the In-Depth Outcomes tab each. */
export type InDepthVariableId =
  | "res_apr"
  | "res_sep"
  | "gw_vol"
  | "gw_trend"
  | "x2_apr"
  | "x2_sep"
  | "station_ec"
  | "cvp_del"
  | "swp_del"
  | "tot_exp"
  | "ndo"
  | "ndo_uif"
  | "riv_flow"
  | "riv_uif"
  | "ag_del"
  | "ag_pump"
  | "ag_short"
  | "ag_shortpct"
  | "ag_rev"
  | "cws_del"
  | "cws_short"

// ----------------------------------------------------------------------------
// Variable definitions
// ----------------------------------------------------------------------------

export interface InDepthVariable {
  /** Display name. */
  name: string
  /** Sector accordion this variable lives under. */
  sectorId: InDepthSectorId
  /** Location group reported over. */
  locationGroupId: LocationGroupId
  /** Synthetic-engine response family (key into KINDS). */
  kindId: InDepthKindId
  /** Scenario-effect family the synthetic engine applies to this variable. */
  effectFamily: string
  /** Display unit. */
  unit: string
  /** Views offered, in display order; first is the default. */
  views: InDepthViewId[]
  /** Plain-language description for a general audience. */
  plain: string
  /** Technical description (data provenance / method). */
  tech: string
  /** Carryover-storage scenarios add a separate September bonus effect. */
  useSepBonus?: boolean
}

export const VARDEF: Record<InDepthVariableId, InDepthVariable> = {
  res_apr: {
    name: "April reservoir storage",
    sectorId: "res",
    locationGroupId: "reservoirs",
    kindId: "storage",
    effectFamily: "storage",
    unit: "TAF",
    views: ["dist", "pct", "monthly", "series", "cv"],
    plain:
      "How full each major reservoir is at the start of April — the end of the wet season, when storage is normally near its peak. The monthly views show the full storage cycle through the year, not just April.",
    tech: "Annual series of end-of-April storage (CalSim3 S_* variables), summarized as percentiles across the simulation period. Also available as percent of capacity. The monthly pattern and time-series views plot the full reservoir storage trace (all months).",
  },
  res_sep: {
    name: "September reservoir storage",
    sectorId: "res",
    locationGroupId: "reservoirs",
    kindId: "storage",
    effectFamily: "storage",
    unit: "TAF",
    useSepBonus: true,
    views: ["dist", "pct", "monthly", "series", "cv"],
    plain:
      "How much water is left in each reservoir at the end of the dry season (carryover storage) — a key buffer against the next year being dry. The monthly views show the full storage cycle through the year, not just September.",
    tech: "Annual series of end-of-September storage, summarized as percentiles. Carryover-targeted scenarios act mainly on this variable. The monthly pattern and time-series views plot the full reservoir storage trace (all months).",
  },
  gw_vol: {
    name: "Groundwater storage volume",
    sectorId: "gw",
    locationGroupId: "basins",
    kindId: "gwstor",
    effectFamily: "gwStor",
    unit: "TAF",
    views: ["dist", "cv"],
    plain:
      "The total amount of water stored underground in each groundwater basin.",
    tech: "Annual groundwater storage percentiles per water budget area (WBA), from CalSim3 groundwater module output.",
  },
  gw_trend: {
    name: "Groundwater level trend",
    sectorId: "gw",
    locationGroupId: "basins",
    kindId: "gwstor",
    effectFamily: "gwTrend",
    unit: "ft/yr",
    views: ["value"],
    plain:
      "Whether groundwater levels are rising or falling over the long run. Negative numbers mean declining aquifers.",
    tech: "Long-term linear trend of simulated groundwater levels (ft/yr) per WBA. Spec lists overall percent change (feet/month); shown annualized here.",
  },
  x2_apr: {
    name: "April X2 position",
    sectorId: "salin",
    locationGroupId: "delta",
    kindId: "x2",
    effectFamily: "sal",
    unit: "km",
    views: ["dist", "cv"],
    plain:
      "How far upstream salty water reaches into the Delta in April. X2 is the distance (km from the Golden Gate) where salinity hits 2 ppt — smaller is fresher.",
    tech: "Annual April X2 percentiles. X2 responds to Delta outflow; spring position matters for estuarine habitat.",
  },
  x2_sep: {
    name: "September X2 position",
    sectorId: "salin",
    locationGroupId: "delta",
    kindId: "x2",
    effectFamily: "sal",
    unit: "km",
    views: ["dist", "cv"],
    plain:
      "How far upstream salty water reaches in September, at the end of the dry season, when the Delta is at its saltiest.",
    tech: "Annual September X2 percentiles. The fall X2 standard is the subject of the 'Relax Delta salinity standards' scenario.",
  },
  station_ec: {
    name: "Station salinity (EC)",
    sectorId: "salin",
    locationGroupId: "stations",
    kindId: "sal",
    effectFamily: "sal",
    unit: "µS/cm",
    views: ["monthly", "series", "dist", "cv"],
    plain:
      "How salty the water is at key Delta locations, month by month. Higher electrical conductivity (EC) = saltier water, which limits drinking and irrigation use.",
    tech: "Monthly EC percentiles at Emmaton, Jersey Point, Banks and Jones (CalSim3 ANN-estimated). Annual distribution uses the annual mean EC.",
  },
  cvp_del: {
    name: "Central Valley Project deliveries",
    sectorId: "sysdel",
    locationGroupId: "sysregions",
    kindId: "exports",
    effectFamily: "exports",
    unit: "TAF",
    views: ["dist", "cv"],
    plain:
      "How much water the federal Central Valley Project delivers to its contractors each year.",
    tech: "Annual CVP delivery percentiles (DEL_CVP_* variables), split North / South of Delta.",
  },
  swp_del: {
    name: "State Water Project deliveries",
    sectorId: "sysdel",
    locationGroupId: "sysregions",
    kindId: "exports",
    effectFamily: "exports",
    unit: "TAF",
    views: ["dist", "cv"],
    plain:
      "How much water the State Water Project delivers to its contractors each year.",
    tech: "Annual SWP delivery percentiles (SWP_*_TOTAL variables), split North / South of Delta.",
  },
  tot_exp: {
    name: "Total Delta exports",
    sectorId: "sysdel",
    locationGroupId: "delta",
    kindId: "exports",
    effectFamily: "exports",
    unit: "TAF",
    views: ["dist", "monthly", "series", "cv"],
    plain:
      "The combined volume of water pumped out of the Delta at the Banks and Jones pumping plants for use elsewhere.",
    tech: "Annual and monthly percentiles of TOTAL_EXP. This is the supply side of the Delta outflow / export trade-off.",
  },
  ndo: {
    name: "Delta outflow volume",
    sectorId: "outflow",
    locationGroupId: "delta",
    kindId: "outflow",
    effectFamily: "outflow",
    unit: "TAF",
    views: ["dist", "monthly", "series", "cv"],
    plain:
      "How much fresh water flows out of the Delta toward San Francisco Bay. Outflow keeps the estuary fresh and supports fish and wildlife.",
    tech: "Net Delta Outflow (NDO), monthly and annual percentiles. Seasonal (spring/fall) breakouts are in the spec; ETL currently computes monthly, annual and September only.",
  },
  ndo_uif: {
    name: "Outflow as % of unimpaired flow",
    sectorId: "outflow",
    locationGroupId: "delta",
    kindId: "pctuif",
    effectFamily: "pctUIF",
    unit: "%",
    views: ["dist"],
    plain:
      "What share of the river water that would naturally reach the Delta actually flows out of it, after storage and diversions.",
    tech: "Annual Delta outflow divided by unimpaired outflow estimate; the % UF scenarios directly target this quantity.",
  },
  riv_flow: {
    name: "River flows",
    sectorId: "eflows",
    locationGroupId: "rivers",
    kindId: "flow",
    effectFamily: "flows",
    unit: "TAF",
    views: ["dist", "monthly", "series", "cv"],
    plain:
      "How much water flows down each major river over the year, and in which months — the basis for healthy river ecosystems.",
    tech: "Annual and monthly flow percentiles at river LOIs (CalSim3 C_* channel variables). Seasonal functional-flow metrics are computed externally.",
  },
  riv_uif: {
    name: "Flow as % of unimpaired",
    sectorId: "eflows",
    locationGroupId: "rivers",
    kindId: "pctuif",
    effectFamily: "pctUIF",
    unit: "%",
    views: ["dist"],
    plain:
      "What share of the river's natural flow remains in the channel after dams and diversions.",
    tech: "Annual percent-of-unimpaired-flow percentiles per river LOI (flagged as provisional in the spec).",
  },
  ag_del: {
    name: "Surface water deliveries",
    sectorId: "ag",
    locationGroupId: "agregions",
    kindId: "agdel",
    effectFamily: "agDel",
    unit: "TAF",
    views: ["dist", "monthly", "series", "cv"],
    plain: "How much river and project water is delivered to farms each year.",
    tech: "Annual agricultural surface delivery percentiles per demand-unit group (LOI / NOD / SOD in spec).",
  },
  ag_pump: {
    name: "Groundwater pumping",
    sectorId: "ag",
    locationGroupId: "agregions",
    kindId: "pump",
    effectFamily: "pump",
    unit: "TAF",
    views: ["dist", "cv"],
    plain:
      "How much groundwater farms pump to make up for surface water they don't receive. Pumping rises in dry years.",
    tech: "Annual agricultural groundwater pumping percentiles. Pumping-limit scenarios constrain this directly.",
  },
  ag_short: {
    name: "Total water shortage",
    sectorId: "ag",
    locationGroupId: "agregions",
    kindId: "short",
    effectFamily: "short",
    unit: "TAF",
    views: ["dist", "cv"],
    plain:
      "How much water farms wanted but did not get, from any source. Zero in wet years; can spike in droughts.",
    tech: "Annual shortage volume percentiles (demand minus deliveries minus pumping), post-processed from CalSim3.",
  },
  ag_shortpct: {
    name: "Shortage as % of demand",
    sectorId: "ag",
    locationGroupId: "agregions",
    kindId: "shortpct",
    effectFamily: "short",
    unit: "%",
    views: ["dist"],
    plain:
      "Shortage expressed as a share of what farms needed — easier to compare across regions of different size.",
    tech: "Annual shortage-percent percentiles per demand-unit group.",
  },
  ag_rev: {
    name: "Gross crop revenues",
    sectorId: "ag",
    locationGroupId: "agregions",
    kindId: "rev",
    effectFamily: "rev",
    unit: "$B",
    views: ["dist", "value"],
    plain:
      "The total value of crops produced, given the water available. Water shortages translate into fallowed land and lost revenue.",
    tech: "Annual gross revenue percentiles from the external agricultural economics model, driven by CalSim3 deliveries and pumping.",
  },
  cws_del: {
    name: "Surface water deliveries",
    sectorId: "cwsS",
    locationGroupId: "cws",
    kindId: "cwsdel",
    effectFamily: "cws",
    unit: "TAF",
    views: ["dist", "cv"],
    plain: "How much water community drinking-water systems receive each year.",
    tech: "Annual CWS surface delivery percentiles per system group (illustrative groups; LOI list is still XX in the spec).",
  },
  cws_short: {
    name: "Delivery shortages",
    sectorId: "cwsS",
    locationGroupId: "cws",
    kindId: "short",
    effectFamily: "cwsShort",
    unit: "TAF",
    views: ["dist", "cv"],
    plain:
      "How much water community systems were short of their needs — the gap the tiers pathway scores against human-health thresholds.",
    tech: "Annual CWS shortage percentiles (external post-processing). Pairs with the Community deliveries tier definition.",
  },
}

// ----------------------------------------------------------------------------
// Sectors (left-rail accordion order)
// ----------------------------------------------------------------------------

export interface InDepthSector {
  id: InDepthSectorId
  name: string
  /** Variables in this sector, in display order. Omitted for locked sectors. */
  vars?: InDepthVariableId[]
  /** Locked sectors are shown but not yet selectable. */
  locked?: boolean
  /** Optional note shown for a locked/placeholder sector. */
  note?: string
}

export const SECTORS: InDepthSector[] = [
  { id: "res", name: "Reservoir storage", vars: ["res_apr", "res_sep"] },
  { id: "gw", name: "Groundwater storage", vars: ["gw_vol", "gw_trend"] },
  {
    id: "salin",
    name: "Delta salinity",
    vars: ["x2_apr", "x2_sep", "station_ec"],
  },
  {
    id: "sysdel",
    name: "System deliveries",
    vars: ["cvp_del", "swp_del", "tot_exp"],
  },
  { id: "outflow", name: "Delta outflows", vars: ["ndo", "ndo_uif"] },
  { id: "eflows", name: "Environmental flows", vars: ["riv_flow", "riv_uif"] },
  {
    id: "ag",
    name: "Agricultural water",
    vars: ["ag_del", "ag_pump", "ag_short", "ag_shortpct", "ag_rev"],
  },
  {
    id: "cwsS",
    name: "Community water systems",
    vars: ["cws_del", "cws_short"],
  },
  {
    id: "salmonS",
    name: "Winter-run salmon",
    locked: true,
    note: "Population metrics in development",
  },
]

// ----------------------------------------------------------------------------
// View metadata (tab labels)
// ----------------------------------------------------------------------------

export const VIEW_META: Record<InDepthViewId, { label: string }> = {
  dist: { label: "Annual distribution" },
  pct: { label: "% of capacity" },
  monthly: { label: "Monthly pattern" },
  series: { label: "Monthly time series" },
  cv: { label: "Year-to-year variability" },
  value: { label: "Summary value" },
}

// ----------------------------------------------------------------------------
// Synthetic-engine tuning (SYNTHETIC — see file header)
//
// KINDS controls climate response, wet/dry-year sensitivity, year-to-year
// variability, and (via `shape`) the seasonal shape of the synthetic series.
// SHAPES are 12-month water-year profiles (Oct→Sep). Consumed by the synthetic
// adapter only; replaced family-by-family as real hooks land.
// ----------------------------------------------------------------------------

/** Water-year month order used by the seasonal SHAPES below. */
export const WATER_YEAR_MONTHS = [
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

export type ShapeId =
  | "storage"
  | "flow"
  | "outflow"
  | "sal"
  | "exports"
  | "agdel"

/** 12-month seasonal profiles (water-year order). */
export const SHAPES: Record<ShapeId, number[]> = {
  storage: [
    0.78, 0.76, 0.78, 0.84, 0.92, 1.0, 1.08, 1.1, 1.05, 0.96, 0.86, 0.8,
  ],
  flow: [
    0.04, 0.05, 0.08, 0.12, 0.15, 0.15, 0.12, 0.11, 0.07, 0.05, 0.03, 0.03,
  ],
  outflow: [
    0.04, 0.06, 0.1, 0.15, 0.17, 0.15, 0.11, 0.09, 0.05, 0.03, 0.02, 0.03,
  ],
  sal: [1.25, 1.15, 0.95, 0.8, 0.7, 0.7, 0.75, 0.85, 0.95, 1.1, 1.25, 1.35],
  exports: [
    0.07, 0.06, 0.07, 0.08, 0.08, 0.08, 0.08, 0.09, 0.1, 0.1, 0.1, 0.09,
  ],
  agdel: [
    0.02, 0.02, 0.02, 0.03, 0.04, 0.07, 0.12, 0.15, 0.16, 0.15, 0.13, 0.09,
  ],
}

export interface KindTuning {
  /** Climate response: fractional shift per unit climate stress. */
  clim: number
  /** Wet/dry-year sensitivity exponent on the shared hydrologic trace. */
  sens: number
  /** Baseline coefficient of variation. */
  cv0: number
  /** Additional CV per unit climate stress. */
  cvS: number
  /** Seasonal shape used for monthly views. */
  shape?: ShapeId
  /** Optional [min, max] clamp applied to each synthetic value. */
  clamp?: [number, number]
}

export const KINDS: Record<InDepthKindId, KindTuning> = {
  storage: { clim: -0.22, sens: 0.5, cv0: 0.18, cvS: 0.45 },
  gwstor: { clim: -0.15, sens: 0.3, cv0: 0.07, cvS: 0.4 },
  flow: { clim: -0.28, sens: 1.1, cv0: 0.3, cvS: 0.5, shape: "flow" },
  outflow: { clim: -0.25, sens: 1.2, cv0: 0.34, cvS: 0.5, shape: "outflow" },
  sal: { clim: 0.18, sens: -0.6, cv0: 0.2, cvS: 0.55, shape: "sal" },
  x2: { clim: 0.1, sens: -0.32, cv0: 0.08, cvS: 0.5 },
  exports: { clim: -0.2, sens: 0.7, cv0: 0.24, cvS: 0.5, shape: "exports" },
  agdel: { clim: -0.18, sens: 0.5, cv0: 0.2, cvS: 0.45, shape: "agdel" },
  pump: { clim: 0.12, sens: -0.45, cv0: 0.16, cvS: 0.4, shape: "agdel" },
  short: { clim: 0.55, sens: -2.0, cv0: 0.55, cvS: 0.4 },
  shortpct: { clim: 0.55, sens: -2.0, cv0: 0.55, cvS: 0.4, clamp: [0, 100] },
  rev: { clim: -0.1, sens: 0.22, cv0: 0.08, cvS: 0.45 },
  cwsdel: { clim: -0.08, sens: 0.22, cv0: 0.06, cvS: 0.45 },
  pctuif: { clim: -0.08, sens: 0.12, cv0: 0.1, cvS: 0.4, clamp: [2, 98] },
}

// ----------------------------------------------------------------------------
// Derived helpers
// ----------------------------------------------------------------------------

/** All variable ids in sector order (the left-rail flattening). */
export const VARIABLE_IDS: InDepthVariableId[] = SECTORS.flatMap(
  (sector) => sector.vars ?? [],
)

/** Default variable on first mount (top of the first sector). */
export const DEFAULT_VARIABLE_ID: InDepthVariableId = "res_apr"

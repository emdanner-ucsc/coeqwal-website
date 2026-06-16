/**
 * In-Depth Outcomes — synthetic adapter.
 *
 * Turns the data-in-depth slice selection (variable + compare axis + the
 * scenario / climate / location picks) into the list of "members" the chart
 * components draw: one line per member, each with its annual series, summary
 * statistics, label and colour. SYNTHETIC throughout (Option A decision #2);
 * swap `annualSeries` for the real `@repo/data` hooks family-by-family later.
 */

import {
  VARDEF,
  type InDepthVariableId,
  type InDepthViewId,
  type LocationGroupId,
} from "../config/inDepthVariables"
import type { CompareBy } from "../../../../store"
import {
  annualSeries,
  defaultLocationId,
  findClimate,
  findLocation,
  findScenario,
  LOCGROUPS,
  MEMBER_PALETTE,
  monthlyBands,
  monthlySeries,
  stats,
  summaryValue,
} from "./inDepthSyntheticEngine"
import { syntheticBox, type ChartMember } from "../data/inDepthDataSource"

export type { ChartMember } from "../data/inDepthDataSource"

export interface BuildMembersArgs {
  variableId: InDepthVariableId
  view: InDepthViewId
  compareBy: CompareBy
  selectedScenarioIds: string[]
  pinnedScenarioId: string
  selectedClimates: string[]
  pinnedClimate: string
  selectedLocations: Partial<Record<LocationGroupId, string[]>>
  pinnedLocation: Partial<Record<LocationGroupId, string>>
}

/** Default selected locations for a group (first three items). */
export function defaultSelectedLocations(group: LocationGroupId): string[] {
  return LOCGROUPS[group].items.slice(0, 3).map((l) => l.id)
}

interface MemberSpec {
  scenarioId: string
  climateId: string
  locationId: string
  label: string
}

/** Resolve which (scenario, climate, location, label) triples to plot. */
function memberSpecs(args: BuildMembersArgs): MemberSpec[] {
  const group = VARDEF[args.variableId].locationGroupId
  const refLocation = args.pinnedLocation[group] ?? defaultLocationId(group)

  if (args.compareBy === "scen") {
    return args.selectedScenarioIds.map((scenarioId) => ({
      scenarioId,
      climateId: args.pinnedClimate,
      locationId: refLocation,
      label: findScenario(scenarioId)?.name ?? scenarioId,
    }))
  }

  if (args.compareBy === "clim") {
    return args.selectedClimates
      .map((id) => findClimate(id))
      .filter((c): c is NonNullable<typeof c> => c != null)
      .map((clim) => ({
        scenarioId: args.pinnedScenarioId,
        climateId: clim.id,
        locationId: refLocation,
        label: clim.name,
      }))
  }

  // compareBy === "loc"
  const locationIds =
    args.selectedLocations[group] ?? defaultSelectedLocations(group)
  return locationIds.map((locationId) => ({
    scenarioId: args.pinnedScenarioId,
    climateId: args.pinnedClimate,
    locationId,
    label: findLocation(group, locationId)?.n ?? locationId,
  }))
}

/** Build the chart members for the current selection (synthetic data). */
export function buildMembers(args: BuildMembersArgs): ChartMember[] {
  const group = VARDEF[args.variableId].locationGroupId
  return memberSpecs(args).map((spec, i) => {
    let series = annualSeries(
      args.variableId,
      spec.scenarioId,
      spec.climateId,
      spec.locationId,
    )
    if (args.view === "pct") {
      const cap = findLocation(group, spec.locationId)?.cap ?? 0
      series = cap > 0 ? series.map((v) => (v / cap) * 100) : series
    }
    const st = stats(series)
    return {
      key: `${spec.scenarioId}|${spec.climateId}|${spec.locationId}`,
      label: spec.label,
      color: MEMBER_PALETTE[i % MEMBER_PALETTE.length] ?? MEMBER_PALETTE[0]!,
      scenarioId: spec.scenarioId,
      climateId: spec.climateId,
      locationId: spec.locationId,
      series,
      box: syntheticBox(st),
      cv: st.cv,
      summaryValue: summaryValue(
        args.variableId,
        spec.scenarioId,
        spec.climateId,
        spec.locationId,
      ),
      // Heavier monthly reductions only for the view that needs them.
      monthlyBands:
        args.view === "monthly"
          ? monthlyBands(
              args.variableId,
              spec.scenarioId,
              spec.climateId,
              spec.locationId,
            )
          : undefined,
      monthlySeries:
        args.view === "series"
          ? monthlySeries(
              args.variableId,
              spec.scenarioId,
              spec.climateId,
              spec.locationId,
            )
          : undefined,
      source: "synthetic",
    }
  })
}

/** Unit shown for the current variable + view (`pct` overrides to "%"). */
export function memberUnit(
  variableId: InDepthVariableId,
  view: InDepthViewId,
): string {
  return view === "pct" ? "%" : VARDEF[variableId].unit
}

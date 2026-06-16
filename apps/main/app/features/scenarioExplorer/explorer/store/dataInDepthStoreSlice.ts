/**
 * Data In-Depth store slice — In-Depth Outcomes explorer session state.
 *
 * Ported from the data-in-depth prototype's flat `state` object per the port
 * mapping §3. Tool settings here survive a page reload within the same tab
 * (see `exploreSessionPersist.ts`).
 *
 * Scenario selection (decision #1, hybrid): on open the explorer seeds
 * `selectedScenarioIds` from the global workspace `selectedScenarios`, always
 * injecting the locked reference (`PRIMARY_SCENARIO_BASELINE_ID`, "Current
 * operations") first, then lets the user curate locally (≤5, tier-aware
 * add-menu). Local edits do NOT write back to the global set — the seeding is
 * done by the view on mount; this slice just holds the local working set, with
 * the locked reference as its initial value.
 *
 * SYNTHETIC NOTE (Option A decision #2): climate / location selections index
 * the synthetic fixtures for now; the ids stay stable when real `@repo/data`
 * hooks replace the synthetic engine.
 */

import { PRIMARY_SCENARIO_BASELINE_ID } from "../../utils/scenarioIdSort"
import type {
  InDepthVariableId,
  InDepthViewId,
  LocationGroupId,
} from "../tools/panels/dataInDepth/config/inDepthVariables"
import { DEFAULT_VARIABLE_ID } from "../tools/panels/dataInDepth/config/inDepthVariables"

/** Distribution sub-toggle: exceedance curve vs. box plot. */
export type DistKind = "exceed" | "box"

/** Comparison axis: across scenarios, climates, or locations. */
export type CompareBy = "scen" | "clim" | "loc"

/** Add-scenario menu grouping. */
export type ScenarioMenuGrouping = "theme" | "tier"

/** Maximum scenarios in the local working set (includes the locked reference). */
export const MAX_IN_DEPTH_SCENARIOS = 5

export interface DataInDepthState {
  /** Active variable (one In-Depth Outcomes row group). */
  selectedVariableId: InDepthVariableId
  /** Active chart view tab. */
  view: InDepthViewId
  /** Distribution sub-toggle (only meaningful for `dist` / `pct` views). */
  distKind: DistKind
  /** Which axis the chart compares across. */
  compareBy: CompareBy
  /** Local working set of scenarios (≤5; locked reference always first). */
  selectedScenarioIds: string[]
  /** Reference scenario pinned in `clim` / `loc` compare modes. */
  pinnedScenarioId: string
  /** Selected climates in `clim` compare mode. */
  selectedClimates: string[]
  /** Reference climate pinned in `scen` / `loc` compare modes. */
  pinnedClimate: string
  /** Selected locations per location group (`loc` compare mode). */
  selectedLocations: Partial<Record<LocationGroupId, string[]>>
  /** Reference location per group, pinned in `scen` / `clim` compare modes. */
  pinnedLocation: Partial<Record<LocationGroupId, string>>
  /** Add-scenario menu grouping (by theme or by tier). */
  scenarioMenuGrouping: ScenarioMenuGrouping
}

export interface DataInDepthActions {
  setSelectedVariableId: (variableId: InDepthVariableId) => void
  setView: (view: InDepthViewId) => void
  setDistKind: (distKind: DistKind) => void
  setCompareBy: (compareBy: CompareBy) => void
  setSelectedScenarioIds: (scenarioIds: string[]) => void
  /** Add a scenario to the working set, respecting the ≤5 cap. No-op if full. */
  addSelectedScenario: (scenarioId: string) => void
  /** Remove a scenario from the working set. The locked reference cannot be removed. */
  removeSelectedScenario: (scenarioId: string) => void
  setPinnedScenarioId: (scenarioId: string) => void
  setSelectedClimates: (climateIds: string[]) => void
  toggleClimate: (climateId: string) => void
  setPinnedClimate: (climateId: string) => void
  setSelectedLocations: (group: LocationGroupId, locationIds: string[]) => void
  toggleLocation: (group: LocationGroupId, locationId: string) => void
  setPinnedLocation: (group: LocationGroupId, locationId: string) => void
  setScenarioMenuGrouping: (grouping: ScenarioMenuGrouping) => void
}

export type DataInDepthSlice = DataInDepthState & DataInDepthActions

export const dataInDepthInitialState: DataInDepthState = {
  selectedVariableId: DEFAULT_VARIABLE_ID,
  view: "dist",
  distKind: "exceed",
  compareBy: "scen",
  // Locked reference only; the view seeds the rest from the global selection on open.
  selectedScenarioIds: [PRIMARY_SCENARIO_BASELINE_ID],
  pinnedScenarioId: PRIMARY_SCENARIO_BASELINE_ID,
  selectedClimates: ["hist", "modhigh", "extreme"],
  pinnedClimate: "hist",
  selectedLocations: {},
  pinnedLocation: {},
  scenarioMenuGrouping: "theme",
}

type ImmerSet = (fn: (state: DataInDepthSlice) => void) => void

export function createDataInDepthSlice(
  set: ImmerSet,
  initial: DataInDepthState = dataInDepthInitialState,
): DataInDepthSlice {
  return {
    ...initial,

    setSelectedVariableId: (variableId) =>
      set((state) => {
        state.selectedVariableId = variableId
      }),

    setView: (view) =>
      set((state) => {
        state.view = view
      }),

    setDistKind: (distKind) =>
      set((state) => {
        state.distKind = distKind
      }),

    setCompareBy: (compareBy) =>
      set((state) => {
        state.compareBy = compareBy
      }),

    setSelectedScenarioIds: (scenarioIds) =>
      set((state) => {
        state.selectedScenarioIds = scenarioIds
      }),

    addSelectedScenario: (scenarioId) =>
      set((state) => {
        if (state.selectedScenarioIds.includes(scenarioId)) return
        if (state.selectedScenarioIds.length >= MAX_IN_DEPTH_SCENARIOS) return
        state.selectedScenarioIds.push(scenarioId)
      }),

    removeSelectedScenario: (scenarioId) =>
      set((state) => {
        if (scenarioId === PRIMARY_SCENARIO_BASELINE_ID) return
        state.selectedScenarioIds = state.selectedScenarioIds.filter(
          (id) => id !== scenarioId,
        )
      }),

    setPinnedScenarioId: (scenarioId) =>
      set((state) => {
        state.pinnedScenarioId = scenarioId
      }),

    setSelectedClimates: (climateIds) =>
      set((state) => {
        state.selectedClimates = climateIds
      }),

    toggleClimate: (climateId) =>
      set((state) => {
        const idx = state.selectedClimates.indexOf(climateId)
        if (idx >= 0) {
          state.selectedClimates.splice(idx, 1)
        } else {
          state.selectedClimates.push(climateId)
        }
      }),

    setPinnedClimate: (climateId) =>
      set((state) => {
        state.pinnedClimate = climateId
      }),

    setSelectedLocations: (group, locationIds) =>
      set((state) => {
        state.selectedLocations[group] = locationIds
      }),

    toggleLocation: (group, locationId) =>
      set((state) => {
        const current = state.selectedLocations[group] ?? []
        const idx = current.indexOf(locationId)
        if (idx >= 0) {
          state.selectedLocations[group] = current.filter(
            (id) => id !== locationId,
          )
        } else {
          state.selectedLocations[group] = [...current, locationId]
        }
      }),

    setPinnedLocation: (group, locationId) =>
      set((state) => {
        state.pinnedLocation[group] = locationId
      }),

    setScenarioMenuGrouping: (grouping) =>
      set((state) => {
        state.scenarioMenuGrouping = grouping
      }),
  }
}

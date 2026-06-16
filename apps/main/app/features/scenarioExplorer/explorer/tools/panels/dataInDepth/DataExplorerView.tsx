"use client"

/**
 * DataExplorerView — In-Depth Outcomes explorer (Option A port).
 *
 * Left-rail variable picker, compare-by + view controls, member chips, and all
 * six chart views: annual distribution (exceedance / box), % of capacity,
 * monthly pattern (small-multiple bands), monthly time series, year-to-year
 * variability (CV bar) and summary value (units bar).
 *
 * Data layering (decision #2): numbers default to the deterministic synthetic
 * engine, with real CalSim data layered over it where available via the seam in
 * `data/inDepthDataSource.ts` — precomputed CSV sidecars (file) back the annual
 * series views (so the exceedance curve and box go real) and, for the flow
 * variables (NDO, river flows), the monthly pattern + time-series views from the
 * sidecar's raw monthly trace; the live API backs the storage box. Variables or
 * scenarios without coverage fall back to synthetic. Each chart states its source.
 */

import React from "react"
import {
  Box,
  Typography,
  useTheme,
  Button,
  Chip,
  IconButton,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from "@repo/ui/mui"
import { ScenarioBadge } from "@repo/ui"
import { useWorkspaceSlice, useDataInDepthSlice } from "../../../store"
import { PRIMARY_SCENARIO_BASELINE_ID } from "../../../../utils/scenarioIdSort"
import {
  SECTORS,
  VARDEF,
  VIEW_META,
  type InDepthVariableId,
} from "./config/inDepthVariables"
import {
  CLIMATES,
  LOCGROUPS,
  findLocation,
} from "./synthetic/inDepthSyntheticEngine"
import { useScenarioList } from "../../../../../scenarios/hooks/useScenarioList"
import {
  buildMembers,
  defaultSelectedLocations,
  memberUnit,
} from "./synthetic/inDepthSyntheticAdapter"
import {
  applyFileSeries,
  applyFileMonthly,
  applyLiveStorage,
  hasFileMember,
  hasLiveMember,
  sidecarCodes,
} from "./data/inDepthDataSource"
import { useResolvedSelectedScenarios } from "./hooks/useResolvedSelectedScenarios"
import { useCalsimSidecars } from "./hooks/useCalsimSidecars"
import { useBatchStatistics } from "@repo/data/coeqwal/hooks"
import DistributionChart from "./components/DistributionChart"
import UnitsBarChart from "./components/UnitsBarChart"
import MonthlyBandChart from "./components/MonthlyBandChart"
import MonthlySeriesChart from "./components/MonthlySeriesChart"

interface DataExplorerViewProps {
  onNavigateToExplorer?: () => void
}

export default function DataExplorerView({
  onNavigateToExplorer,
}: DataExplorerViewProps) {
  const theme = useTheme()
  const { selectedScenarios } = useWorkspaceSlice()
  const slice = useDataInDepthSlice()
  const {
    selectedVariableId,
    view,
    distKind,
    compareBy,
    selectedScenarioIds,
    pinnedClimate,
    selectedClimates,
    setSelectedVariableId,
    setView,
    setDistKind,
    setCompareBy,
    setSelectedScenarioIds,
    addSelectedScenario,
    removeSelectedScenario,
    toggleClimate,
    toggleLocation,
  } = slice

  const variable = VARDEF[selectedVariableId]
  const group = variable.locationGroupId

  // Real scenario list (names + themes); the picker no longer uses the synthetic
  // fixtures. Ids are sibling-group ids — the same space as the workspace
  // selection the local set is seeded from.
  const { siblingGroups, getDisplayName, getThemeForScenario } =
    useScenarioList()
  const scenarioName = (id: string) => getDisplayName(id) || id

  // Decision #1 (hybrid): seed the local set from the global selection once on
  // open, while the local set is still just the locked reference. Local edits
  // afterwards are preserved and never written back to the global selection.
  const seededRef = React.useRef(false)
  React.useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    const onlyReference =
      selectedScenarioIds.length === 1 &&
      selectedScenarioIds[0] === PRIMARY_SCENARIO_BASELINE_ID
    if (!onlyReference) return
    const seeded = [
      PRIMARY_SCENARIO_BASELINE_ID,
      ...selectedScenarios.filter((id) => id !== PRIMARY_SCENARIO_BASELINE_ID),
    ].slice(0, 5)
    if (seeded.length > 1) setSelectedScenarioIds(seeded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ensure location-compare has a default working set for the current group.
  const locationIds =
    slice.selectedLocations[group] ?? defaultSelectedLocations(group)

  const syntheticMembers = buildMembers({
    variableId: selectedVariableId,
    view,
    compareBy,
    selectedScenarioIds,
    pinnedScenarioId: slice.pinnedScenarioId,
    selectedClimates,
    pinnedClimate,
    selectedLocations: { ...slice.selectedLocations, [group]: locationIds },
    pinnedLocation: slice.pinnedLocation,
    scenarioName,
  })

  // Resolve the global selection to scenario short_codes at the map hydroclimate.
  const { resolvedIds, groupToResolved } = useResolvedSelectedScenarios()

  // Precomputed CalSim sidecars (annual series reduced from the raw CSV). These
  // carry the FULL series, so they back the exceedance curve AND the box.
  const codes = sidecarCodes(
    selectedScenarioIds,
    resolvedIds,
    slice.pinnedScenarioId,
  )
  const sidecars = useCalsimSidecars(codes)

  // One batched API fetch (storage percentiles) — backs the box where no sidecar.
  const { data: batchData } = useBatchStatistics(resolvedIds, {
    types: ["storage"],
  })

  // Layer the real sources over synthetic: precomputed file first (fullest), then
  // the live-API storage box for any member the file didn't cover.
  const fileMembers = applyFileSeries(syntheticMembers, {
    variableId: selectedVariableId,
    view,
    sidecars,
    groupToShortCode: groupToResolved,
    capForLocation: (locId) => findLocation(group, locId)?.cap,
  })
  // Monthly views read the raw monthly trace from the same sidecars (ndo, riv_flow).
  const monthlyMembers = applyFileMonthly(fileMembers, {
    variableId: selectedVariableId,
    view,
    sidecars,
    groupToShortCode: groupToResolved,
  })
  const members = applyLiveStorage(monthlyMembers, {
    variableId: selectedVariableId,
    view,
    compareBy,
    groupToShortCode: groupToResolved,
    batch: batchData,
  })

  const unit = memberUnit(selectedVariableId, view)
  const isDistribution = view === "dist" || view === "pct"
  const fileActive = hasFileMember(members)
  const boxIsLive =
    distKind === "box" && isDistribution && hasLiveMember(members)
  const innerBandLabel = members[0]?.box.innerLabel ?? "25th–75th"

  const availableToAdd = siblingGroups
    .filter((s) => !selectedScenarioIds.includes(s.scenarioId))
    .map((s) => ({ id: s.scenarioId, name: s.label }))

  return (
    <Box sx={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Left rail — variable picker */}
      <Box
        sx={{
          width: 248,
          flexShrink: 0,
          borderRight: theme.border.light,
          overflowY: "auto",
          p: 2,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {SECTORS.map((sector) => (
          <Box key={sector.id} sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {sector.name}
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {sector.locked || !sector.vars ? (
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.grey[500], fontStyle: "italic" }}
                >
                  {sector.note ?? "Coming soon"}
                </Typography>
              ) : (
                sector.vars.map((vid: InDepthVariableId) => {
                  const selected = vid === selectedVariableId
                  return (
                    <Button
                      key={vid}
                      size="small"
                      onClick={() => setSelectedVariableId(vid)}
                      sx={{
                        justifyContent: "flex-start",
                        textTransform: "none",
                        fontWeight: selected ? 600 : 400,
                        color: selected
                          ? theme.palette.blue.darkest
                          : theme.palette.text.primary,
                        backgroundColor: selected
                          ? theme.palette.action.selected
                          : "transparent",
                      }}
                    >
                      {VARDEF[vid].name}
                    </Button>
                  )
                })
              )}
            </Stack>
          </Box>
        ))}
      </Box>

      {/* Main column */}
      <Box
        sx={{ flex: 1, minWidth: 0, overflowY: "auto", p: { xs: 2, md: 3 } }}
      >
        {fileActive ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Real CalSim 3 data — drawn from raw model output (precomputed) for
            the scenarios that have it. Scenarios or variables without it fall
            back to the synthetic stand-in, labelled below.
          </Alert>
        ) : boxIsLive ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Live preview — this box plot is drawn from real CalSim 3 storage
            statistics at the current hydroclimate. The exceedance curve and all
            other variables are still synthetic.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Synthetic preview — every number here is illustrative, generated by
            a deterministic stand-in engine, not real CalSim 3 output.
          </Alert>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {variable.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary, mt: 0.5, maxWidth: 720 }}
        >
          {variable.plain}
        </Typography>

        {/* Controls */}
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 2, flexWrap: "wrap", rowGap: 1.5, alignItems: "center" }}
        >
          <ControlGroup label="Compare by">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={compareBy}
              onChange={(_, v) => v && setCompareBy(v)}
            >
              <ToggleButton value="scen">Scenarios</ToggleButton>
              <ToggleButton value="clim">Climate futures</ToggleButton>
              <ToggleButton value="loc">Locations</ToggleButton>
            </ToggleButtonGroup>
          </ControlGroup>

          <ControlGroup label="View">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, v) => v && setView(v)}
            >
              {variable.views.map((v) => (
                <ToggleButton key={v} value={v}>
                  {VIEW_META[v].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </ControlGroup>

          {isDistribution && (
            <ControlGroup label="Chart">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={distKind}
                onChange={(_, v) => v && setDistKind(v)}
              >
                <ToggleButton value="exceed">Exceedance</ToggleButton>
                <ToggleButton value="box">Box plot</ToggleButton>
              </ToggleButtonGroup>
            </ControlGroup>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Member selection */}
        <MemberControls
          compareBy={compareBy}
          selectedScenarioIds={selectedScenarioIds}
          selectedClimates={selectedClimates}
          locationIds={locationIds}
          group={group}
          availableToAdd={availableToAdd}
          scenarioName={scenarioName}
          scenarioTheme={getThemeForScenario}
          onAddScenario={addSelectedScenario}
          onRemoveScenario={removeSelectedScenario}
          onToggleClimate={toggleClimate}
          onToggleLocation={toggleLocation}
        />

        {/* Chart */}
        <Box sx={{ mt: 2 }}>
          {members.length === 0 ? (
            <Typography variant="body2" sx={{ color: theme.palette.grey[600] }}>
              Select at least one{" "}
              {compareBy === "scen"
                ? "scenario"
                : compareBy === "clim"
                  ? "climate"
                  : "location"}{" "}
              to draw the chart.
            </Typography>
          ) : isDistribution ? (
            <>
              <DistributionChart
                members={members}
                mode={distKind}
                unit={unit}
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.5,
                  color: theme.palette.text.secondary,
                }}
              >
                {distKind === "box"
                  ? `Box spans the ${innerBandLabel} percentiles; whiskers reach the 10th–90th. `
                  : "Each curve is one member's full annual distribution. "}
                {fileActive
                  ? "Real CalSim 3 data (precomputed from raw output)."
                  : boxIsLive
                    ? "Live CalSim 3 storage statistics."
                    : "Synthetic stand-in data."}
              </Typography>
            </>
          ) : view === "cv" ? (
            <>
              <UnitsBarChart
                bars={members.map((m) => ({
                  key: m.key,
                  label: m.label,
                  color: m.color,
                  value: m.cv * 100,
                }))}
                unit="%"
              />
              <ChartSourceNote fileActive={fileActive} />
            </>
          ) : view === "value" ? (
            <>
              <UnitsBarChart
                bars={members.map((m) => ({
                  key: m.key,
                  label: m.label,
                  color: m.color,
                  value: m.summaryValue,
                }))}
                unit={variable.unit}
              />
              <ChartSourceNote fileActive={fileActive} />
            </>
          ) : view === "monthly" ? (
            <>
              <MonthlyBandChart members={members} unit={unit} />
              <ChartSourceNote fileActive={fileActive} />
            </>
          ) : (
            <>
              <MonthlySeriesChart members={members} unit={unit} />
              <ChartSourceNote fileActive={fileActive} />
            </>
          )}
        </Box>

        {selectedScenarios.length === 0 && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onNavigateToExplorer}
            >
              Choose scenarios in Explore
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function ChartSourceNote({ fileActive }: { fileActive: boolean }) {
  const theme = useTheme()
  return (
    <Typography
      variant="caption"
      sx={{ display: "block", mt: 0.5, color: theme.palette.text.secondary }}
    >
      {fileActive
        ? "Real CalSim 3 data (precomputed from raw output)."
        : "Synthetic stand-in data."}
    </Typography>
  )
}

function ControlGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: theme.palette.text.secondary,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

interface MemberControlsProps {
  compareBy: "scen" | "clim" | "loc"
  selectedScenarioIds: string[]
  selectedClimates: string[]
  locationIds: string[]
  group: keyof typeof LOCGROUPS
  availableToAdd: { id: string; name: string }[]
  scenarioName: (id: string) => string
  scenarioTheme: (id: string) => string
  onAddScenario: (id: string) => void
  onRemoveScenario: (id: string) => void
  onToggleClimate: (id: string) => void
  onToggleLocation: (group: keyof typeof LOCGROUPS, id: string) => void
}

function MemberControls({
  compareBy,
  selectedScenarioIds,
  selectedClimates,
  locationIds,
  group,
  availableToAdd,
  scenarioName,
  scenarioTheme,
  onAddScenario,
  onRemoveScenario,
  onToggleClimate,
  onToggleLocation,
}: MemberControlsProps) {
  const theme = useTheme()

  if (compareBy === "scen") {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: "wrap", rowGap: 1, alignItems: "center" }}
      >
        {selectedScenarioIds.map((id) => {
          const isReference = id === PRIMARY_SCENARIO_BASELINE_ID
          // Colour the badge by the scenario's water theme, matching the
          // sidebar accordion headers / theme subheaders elsewhere on the site.
          const wt =
            theme.palette.waterThemes[
              scenarioTheme(id) as keyof typeof theme.palette.waterThemes
            ] ?? theme.palette.waterThemes.unthemed
          return (
            <Box
              key={id}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                border: theme.border.light,
                borderRadius: "4px",
                pl: 0.5,
                pr: isReference ? 0.75 : 0.25,
                py: 0.25,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <ScenarioBadge
                label={scenarioName(id)}
                backgroundColor={wt.background}
                color={wt.text}
              />
              {isReference ? (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontStyle: "italic",
                  }}
                >
                  reference
                </Typography>
              ) : (
                <IconButton
                  size="small"
                  aria-label={`Remove ${scenarioName(id)}`}
                  onClick={() => onRemoveScenario(id)}
                  sx={{
                    p: 0,
                    width: 16,
                    height: 16,
                    fontSize: 15,
                    lineHeight: 1,
                    color: theme.palette.text.secondary,
                    "&:hover": { color: theme.palette.text.primary },
                  }}
                >
                  ×
                </IconButton>
              )}
            </Box>
          )
        })}
        {selectedScenarioIds.length < 5 && availableToAdd.length > 0 && (
          <Select
            size="small"
            value=""
            displayEmpty
            onChange={(e: SelectChangeEvent) => onAddScenario(e.target.value)}
            sx={{ minWidth: 160, fontSize: 13 }}
          >
            <MenuItem value="" disabled>
              + Add scenario
            </MenuItem>
            {availableToAdd.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: 13 }}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        )}
      </Stack>
    )
  }

  if (compareBy === "clim") {
    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        {CLIMATES.map((c) => {
          const on = selectedClimates.includes(c.id)
          return (
            <Chip
              key={c.id}
              size="small"
              label={c.name}
              onClick={() => onToggleClimate(c.id)}
              variant={on ? "filled" : "outlined"}
              color={on ? "primary" : "default"}
            />
          )
        })}
      </Stack>
    )
  }

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: theme.palette.text.secondary, display: "block", mb: 0.5 }}
      >
        {LOCGROUPS[group].label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        {LOCGROUPS[group].items.map((l) => {
          const on = locationIds.includes(l.id)
          return (
            <Chip
              key={l.id}
              size="small"
              label={l.n}
              onClick={() => onToggleLocation(group, l.id)}
              variant={on ? "filled" : "outlined"}
              color={on ? "primary" : "default"}
            />
          )
        })}
      </Stack>
    </Box>
  )
}

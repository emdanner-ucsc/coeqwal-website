"use client"

/**
 * DataExplorerView — In-Depth Outcomes explorer (Option A port).
 *
 * First rendering cut: left-rail variable picker, compare-by + view controls,
 * member chips, and the signature exceedance / box distribution chart, driven
 * by the data-in-depth store slice and the SYNTHETIC adapter.
 *
 * SYNTHETIC throughout (decision #2): every number comes from the deterministic
 * synthetic engine and is illustrative only. Views other than the annual
 * distribution (monthly / time-series / variability / summary) are still being
 * ported and show a placeholder for now.
 */

import React from "react"
import {
  Box,
  Typography,
  useTheme,
  Button,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from "@repo/ui/mui"
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
  SCENARIOS,
  findScenario,
} from "./synthetic/inDepthSyntheticEngine"
import {
  buildMembers,
  defaultSelectedLocations,
  memberUnit,
} from "./synthetic/inDepthSyntheticAdapter"
import DistributionChart from "./components/DistributionChart"

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

  const members = buildMembers({
    variableId: selectedVariableId,
    view,
    compareBy,
    selectedScenarioIds,
    pinnedScenarioId: slice.pinnedScenarioId,
    selectedClimates,
    pinnedClimate,
    selectedLocations: { ...slice.selectedLocations, [group]: locationIds },
    pinnedLocation: slice.pinnedLocation,
  })

  const unit = memberUnit(selectedVariableId, view)
  const isDistribution = view === "dist" || view === "pct"

  const availableToAdd = SCENARIOS.filter(
    (s) => !selectedScenarioIds.includes(s.id),
  )

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
        <Alert severity="warning" sx={{ mb: 2 }}>
          Synthetic preview — every number here is illustrative, generated by a
          deterministic stand-in engine, not real CalSim 3 output.
        </Alert>

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
          onAddScenario={addSelectedScenario}
          onRemoveScenario={removeSelectedScenario}
          onToggleClimate={toggleClimate}
          onToggleLocation={toggleLocation}
        />

        {/* Chart */}
        <Box sx={{ mt: 2 }}>
          {isDistribution ? (
            members.length > 0 ? (
              <DistributionChart
                members={members}
                mode={distKind}
                unit={unit}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{ color: theme.palette.grey[600] }}
              >
                Select at least one{" "}
                {compareBy === "scen"
                  ? "scenario"
                  : compareBy === "clim"
                    ? "climate"
                    : "location"}{" "}
                to draw the chart.
              </Typography>
            )
          ) : (
            <Box
              sx={{
                p: 4,
                border: theme.border.light,
                borderRadius: 1,
                color: theme.palette.grey[600],
              }}
            >
              <Typography variant="body2">
                The “{VIEW_META[view].label}” view is still being ported. The
                annual distribution (exceedance and box plot) is the first live
                view — switch “View” back to it to see the chart.
              </Typography>
            </Box>
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
  onAddScenario,
  onRemoveScenario,
  onToggleClimate,
  onToggleLocation,
}: MemberControlsProps) {
  const theme = useTheme()

  if (compareBy === "scen") {
    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        {selectedScenarioIds.map((id) => {
          const isReference = id === PRIMARY_SCENARIO_BASELINE_ID
          return (
            <Chip
              key={id}
              size="small"
              label={
                (findScenario(id)?.name ?? id) +
                (isReference ? " · reference" : "")
              }
              onDelete={isReference ? undefined : () => onRemoveScenario(id)}
              variant={isReference ? "filled" : "outlined"}
              sx={isReference ? { fontWeight: 600 } : undefined}
            />
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

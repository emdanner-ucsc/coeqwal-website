"use client"

/**
 * MonthlySeriesChart — the raw monthly trace over the whole simulation.
 *
 * One thin continuous line per member across the full NYEARS×12 monthly series
 * (water-year order), nothing averaged. Overlay stays legible because the lines
 * are thin and unfilled. Declarative SVG, responsive via `useResizeObserver`.
 * SYNTHETIC for now (the sidecar carries annual series only).
 */

import React, { useMemo, useRef } from "react"
import { scaleLinear, ticks, useResizeObserver } from "@repo/viz"
import type { ChartMember } from "../data/inDepthDataSource"
import { AXIS, fmt, GRID, TEXT } from "./chartFormat"

export interface MonthlySeriesChartProps {
  members: ChartMember[]
  unit: string
  /** Years per x-axis label tick. */
  height?: number
}

const MARGIN = { top: 16, right: 20, bottom: 40, left: 64 }
const MONTHS_PER_YEAR = 12

const MonthlySeriesChart: React.FC<MonthlySeriesChartProps> = React.memo(
  ({ members, unit, height = 360 }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const dims = useResizeObserver(containerRef as React.RefObject<HTMLElement>)
    const width = dims?.width && dims.width > 0 ? dims.width : 760

    const traces = members.filter((m) => (m.monthlySeries?.length ?? 0) > 0)

    const innerLeft = MARGIN.left
    const innerRight = width - MARGIN.right
    const innerTop = MARGIN.top
    const innerBottom = height - MARGIN.bottom

    const nPoints = traces[0]?.monthlySeries?.length ?? 0
    const nYears = Math.max(1, Math.round(nPoints / MONTHS_PER_YEAR))

    const { lo, hi } = useMemo(() => {
      let lo = Infinity
      let hi = -Infinity
      traces.forEach((m) => {
        m.monthlySeries!.forEach((v) => {
          lo = Math.min(lo, v)
          hi = Math.max(hi, v)
        })
      })
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
        lo = 0
        hi = 1
      }
      if (lo > 0 && lo / hi < 0.25) lo = 0
      hi = hi * 1.04
      if (lo === hi) hi = lo + 1
      return { lo, hi }
    }, [traces])

    const xScale = useMemo(
      () =>
        scaleLinear()
          .domain([0, Math.max(1, nPoints - 1)])
          .range([innerLeft, innerRight]),
      [nPoints, innerLeft, innerRight],
    )
    const yScale = useMemo(
      () => scaleLinear().domain([lo, hi]).range([innerBottom, innerTop]),
      [lo, hi, innerBottom, innerTop],
    )
    const yTicks = useMemo(() => ticks(lo, hi, 6), [lo, hi])

    // Year ticks (simulation year index) every ~10 years.
    const yearStep = nYears > 60 ? 20 : 10
    const yearTicks = useMemo(() => {
      const out: number[] = []
      for (let yr = 0; yr <= nYears; yr += yearStep) out.push(yr)
      return out
    }, [nYears, yearStep])

    const polylines = useMemo(
      () =>
        traces.map((m) => ({
          key: m.key,
          color: m.color,
          pts: m
            .monthlySeries!.map(
              (v, k) => `${xScale(k).toFixed(1)},${yScale(v).toFixed(1)}`,
            )
            .join(" "),
        })),
      [traces, xScale, yScale],
    )

    if (traces.length === 0) return null

    return (
      <div ref={containerRef} style={{ width: "100%" }}>
        <svg width={width} height={height} style={{ display: "block" }}>
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={innerLeft}
                x2={innerRight}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke={GRID}
              />
              <text
                x={innerLeft - 8}
                y={yScale(t)}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={11}
                fill={TEXT}
              >
                {fmt(t, unit)}
              </text>
            </g>
          ))}
          <line
            x1={innerLeft}
            x2={innerRight}
            y1={innerBottom}
            y2={innerBottom}
            stroke={AXIS}
          />
          <line
            x1={innerLeft}
            x2={innerLeft}
            y1={innerTop}
            y2={innerBottom}
            stroke={AXIS}
          />
          {yearTicks.map((yr) => (
            <text
              key={yr}
              x={xScale(yr * MONTHS_PER_YEAR)}
              y={innerBottom + 16}
              textAnchor="middle"
              fontSize={11}
              fill={TEXT}
            >
              {yr}
            </text>
          ))}
          {polylines.map((p) => (
            <polyline
              key={p.key}
              points={p.pts}
              fill="none"
              stroke={p.color}
              strokeWidth={0.8}
              strokeOpacity={0.85}
            />
          ))}
          <text
            x={(innerLeft + innerRight) / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize={11}
            fill={TEXT}
          >
            Simulation year
          </text>
        </svg>
      </div>
    )
  },
)

MonthlySeriesChart.displayName = "MonthlySeriesChart"

export default MonthlySeriesChart

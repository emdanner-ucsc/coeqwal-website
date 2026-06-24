"use client"

/**
 * UnitsBarChart — one labelled bar per member in real units, with a zero line.
 *
 * Backs the "year-to-year variability" (CV) and "summary value" views. Unlike a
 * tier bar it keeps real units and a true zero line, so negative values (e.g.
 * groundwater level trend, ft/yr) render below the axis. Declarative SVG,
 * responsive via `useResizeObserver`.
 */

import React, { useMemo, useRef } from "react"
import { scaleLinear, ticks, useResizeObserver } from "@repo/viz"
import { AXIS, fmt, GRID, TEXT } from "./chartFormat"

export interface UnitsBar {
  key: string
  label: string
  color: string
  value: number
}

export interface UnitsBarChartProps {
  bars: UnitsBar[]
  unit: string
  /** Rotated y-axis title (quantity + unit). */
  yLabel?: string
  height?: number
}

const MARGIN = { top: 16, right: 20, bottom: 40, left: 72 }

const UnitsBarChart: React.FC<UnitsBarChartProps> = React.memo(
  ({ bars, unit, yLabel, height = 360 }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const dims = useResizeObserver(containerRef as React.RefObject<HTMLElement>)
    const width = dims?.width && dims.width > 0 ? dims.width : 720

    const innerLeft = MARGIN.left
    const innerRight = width - MARGIN.right
    const innerTop = MARGIN.top
    const innerBottom = height - MARGIN.bottom

    const { lo, hi } = useMemo(() => {
      let lo = 0
      let hi = 0
      bars.forEach((b) => {
        lo = Math.min(lo, b.value)
        hi = Math.max(hi, b.value)
      })
      if (lo === hi) hi = lo + 1
      const pad = (hi - lo) * 0.08
      return { lo: lo - (lo < 0 ? pad : 0), hi: hi + pad }
    }, [bars])

    const yScale = useMemo(
      () => scaleLinear().domain([lo, hi]).range([innerBottom, innerTop]),
      [lo, hi, innerBottom, innerTop],
    )
    const yTicks = useMemo(() => ticks(lo, hi, 6), [lo, hi])

    const n = bars.length
    const slot = (innerRight - innerLeft) / Math.max(1, n)
    const barW = Math.min(64, slot * 0.55)
    const zeroY = yScale(0)

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
            x2={innerLeft}
            y1={innerTop}
            y2={innerBottom}
            stroke={AXIS}
          />

          {/* y-axis title */}
          {yLabel && (
            <text
              x={16}
              y={(innerTop + innerBottom) / 2}
              transform={`rotate(-90 16 ${(innerTop + innerBottom) / 2})`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill={TEXT}
            >
              {yLabel}
            </text>
          )}

          {/* zero line (emphasised) */}
          <line
            x1={innerLeft}
            x2={innerRight}
            y1={zeroY}
            y2={zeroY}
            stroke={AXIS}
            strokeWidth={1.5}
          />

          {bars.map((b, i) => {
            const cx = innerLeft + slot * (i + 0.5)
            const y = yScale(b.value)
            const top = Math.min(y, zeroY)
            const barHeight = Math.max(1, Math.abs(y - zeroY))
            return (
              <g key={b.key}>
                <rect
                  x={cx - barW / 2}
                  y={top}
                  width={barW}
                  height={barHeight}
                  fill={b.color}
                  fillOpacity={0.85}
                />
                <text
                  x={cx}
                  y={b.value >= 0 ? y - 5 : y + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fill={TEXT}
                >
                  {fmt(b.value, unit)}
                </text>
                <text
                  x={cx}
                  y={innerBottom + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill={TEXT}
                >
                  {b.label.length > 16 ? b.label.slice(0, 15) + "…" : b.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  },
)

UnitsBarChart.displayName = "UnitsBarChart"

export default UnitsBarChart

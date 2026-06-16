"use client"

/**
 * DistributionChart — the In-Depth explorer's signature distribution view.
 *
 * Two modes over the same annual data:
 *  - "exceed": one exceedance curve per member (sorted descending; x = percent
 *    of years the value is equaled or exceeded). Hover gives a per-member readout.
 *  - "box": p10/p25/p50/p75/p90 box-and-whisker per member.
 *
 * Declarative React SVG (no D3 teardown), responsive via `useResizeObserver`.
 * Data is SYNTHETIC (see the synthetic engine); this component is data-source
 * agnostic — it just draws the `ChartMember` series it is given.
 */

import React, { useMemo, useRef, useState } from "react"
import { scaleLinear, ticks, useResizeObserver } from "@repo/viz"
import type { ChartMember } from "../synthetic/inDepthSyntheticAdapter"
import ChartLegend, { legendHeight } from "./ChartLegend"

export interface DistributionChartProps {
  members: ChartMember[]
  mode: "exceed" | "box"
  unit: string
  height?: number
}

const MARGIN = { top: 16, right: 20, bottom: 44, left: 60 }
const AXIS = "#9aa7b2"
const GRID = "#e6ebef"
const TEXT = "#41525f"
const X_TICKS = [0, 10, 25, 50, 75, 90, 100]

function fmt(v: number, unit: string): string {
  if (v == null || Number.isNaN(v)) return "–"
  const a = Math.abs(v)
  let d: number
  if (unit === "$B") d = 1
  else if (unit === "ft/yr") d = 2
  else if (unit === "km") d = 1
  else if (unit === "%") d = a < 10 ? 1 : 0
  else if (a >= 100) d = 0
  else if (a >= 10) d = 1
  else d = 2
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

/** Value at exceedance percentile p (0–100) over a descending-sorted series. */
function valueAtExceedance(sortedDesc: number[], pPercent: number): number {
  const n = sortedDesc.length
  if (n === 0) return NaN
  // Curve x for index k is (k + 0.5)/n * 100; invert to a fractional index.
  const idx = (pPercent / 100) * n - 0.5
  if (idx <= 0) return sortedDesc[0]!
  if (idx >= n - 1) return sortedDesc[n - 1]!
  const lo = Math.floor(idx)
  const frac = idx - lo
  const a = sortedDesc[lo]!
  const b = sortedDesc[lo + 1]!
  return a + (b - a) * frac
}

const DistributionChart: React.FC<DistributionChartProps> = React.memo(
  ({ members, mode, unit, height = 420 }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const dims = useResizeObserver(containerRef as React.RefObject<HTMLElement>)
    const width = dims?.width && dims.width > 0 ? dims.width : 760
    const [hoverPct, setHoverPct] = useState<number | null>(null)

    const innerLeft = MARGIN.left
    const innerRight = width - MARGIN.right
    // Reserve a top strip for the legend (drawn in-SVG so it travels with the
    // exported figure). The plot keeps its full height; the legend adds to it.
    const legendItems = useMemo(
      () =>
        members.map((m) => ({ key: m.key, label: m.label, color: m.color })),
      [members],
    )
    const legendH = legendHeight(legendItems, innerRight - innerLeft)
    const svgHeight = height + legendH
    const innerTop = MARGIN.top + legendH
    const innerBottom = svgHeight - MARGIN.bottom

    // Sorted-descending series per member (memoized).
    const sorted = useMemo(
      () => members.map((m) => [...m.series].sort((a, b) => b - a)),
      [members],
    )

    // y-domain with the prototype's padding rules. Box mode spans the box
    // five-number summaries (which may be live and exceed the synthetic series);
    // exceedance mode spans the full sorted series.
    const { lo, hi } = useMemo(() => {
      let lo = Infinity
      let hi = -Infinity
      if (mode === "box") {
        members.forEach((m) => {
          lo = Math.min(lo, m.box.whiskerLo)
          hi = Math.max(hi, m.box.whiskerHi)
        })
      } else {
        sorted.forEach((s) => {
          if (s.length === 0) return
          lo = Math.min(lo, s[s.length - 1]!)
          hi = Math.max(hi, s[0]!)
        })
      }
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
        lo = 0
        hi = 1
      }
      if (unit === "%") {
        lo = Math.max(0, lo)
        hi = Math.min(100, hi * 1.05)
      } else {
        lo = lo * 0.95
        hi = hi * 1.05
      }
      if (lo > 0 && lo / hi < 0.25) lo = 0
      if (lo === hi) hi = lo + 1
      return { lo, hi }
    }, [mode, members, sorted, unit])

    const xScale = useMemo(
      () => scaleLinear().domain([0, 100]).range([innerLeft, innerRight]),
      [innerLeft, innerRight],
    )
    const yScale = useMemo(
      () => scaleLinear().domain([lo, hi]).range([innerBottom, innerTop]),
      [lo, hi, innerBottom, innerTop],
    )
    const yTicks = useMemo(() => ticks(lo, hi, 6), [lo, hi])

    const exceedPaths = useMemo(() => {
      if (mode !== "exceed") return []
      return members.map((m, i) => {
        const s = sorted[i] ?? []
        const pts = s
          .map((v, k) => {
            const x = xScale(((k + 0.5) / s.length) * 100)
            const y = yScale(v)
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(" ")
        return { pts, color: m.color, key: m.key }
      })
    }, [mode, sorted, xScale, yScale, members])

    const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left + innerLeft
      const pct = Math.max(0, Math.min(100, xScale.invert(x)))
      setHoverPct(pct)
    }

    return (
      <div ref={containerRef} style={{ width: "100%" }}>
        <svg width={width} height={svgHeight} style={{ display: "block" }}>
          {/* legend (in-SVG so it is included in SVG export) */}
          <ChartLegend
            items={legendItems}
            x={innerLeft}
            y={MARGIN.top}
            width={innerRight - innerLeft}
          />
          {/* y grid + labels */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={innerLeft}
                x2={innerRight}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke={GRID}
                strokeWidth={1}
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

          {/* axes */}
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

          {mode === "exceed" ? (
            <>
              {X_TICKS.map((t) => (
                <text
                  key={`x${t}`}
                  x={xScale(t)}
                  y={innerBottom + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fill={TEXT}
                >
                  {t}%
                </text>
              ))}
              {exceedPaths.map((p) => (
                <polyline
                  key={p.key}
                  points={p.pts}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                />
              ))}
              {hoverPct != null && (
                <line
                  x1={xScale(hoverPct)}
                  x2={xScale(hoverPct)}
                  y1={innerTop}
                  y2={innerBottom}
                  stroke="#1a2733"
                  strokeDasharray="3,3"
                  opacity={0.7}
                />
              )}
              {/* hover capture */}
              <rect
                x={innerLeft}
                y={innerTop}
                width={Math.max(0, innerRight - innerLeft)}
                height={Math.max(0, innerBottom - innerTop)}
                fill="transparent"
                onMouseMove={handleMove}
                onMouseLeave={() => setHoverPct(null)}
              />
            </>
          ) : (
            <BoxLayer
              members={members}
              sorted={sorted}
              yScale={yScale}
              innerLeft={innerLeft}
              innerRight={innerRight}
            />
          )}

          {/* x-axis caption */}
          <text
            x={(innerLeft + innerRight) / 2}
            y={svgHeight - 6}
            textAnchor="middle"
            fontSize={11}
            fill={TEXT}
          >
            {mode === "exceed"
              ? "Percent of years value is equaled or exceeded"
              : "One box per member"}
          </text>
        </svg>

        {/* hover readout */}
        {mode === "exceed" && hoverPct != null && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: TEXT,
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 16px",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {hoverPct.toFixed(0)}% of years ≥
            </span>
            {members.map((m, i) => (
              <span key={m.key} style={{ color: m.color }}>
                ● {m.label}:{" "}
                {fmt(valueAtExceedance(sorted[i] ?? [], hoverPct), unit)} {unit}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  },
)

DistributionChart.displayName = "DistributionChart"

interface BoxLayerProps {
  members: ChartMember[]
  sorted: number[][]
  yScale: (v: number) => number
  innerLeft: number
  innerRight: number
}

/** p10/p25/p50/p75/p90 box-and-whisker, one slot per member. */
const BoxLayer: React.FC<BoxLayerProps> = ({
  members,
  yScale,
  innerLeft,
  innerRight,
}) => {
  const n = members.length
  const slot = (innerRight - innerLeft) / Math.max(1, n)
  const boxW = Math.min(48, slot * 0.5)
  return (
    <>
      {members.map((m, i) => {
        const cx = innerLeft + slot * (i + 0.5)
        const b = m.box
        return (
          <g key={m.key}>
            <line
              x1={cx}
              x2={cx}
              y1={yScale(b.whiskerHi)}
              y2={yScale(b.whiskerLo)}
              stroke={m.color}
              strokeWidth={1.5}
            />
            <rect
              x={cx - boxW / 2}
              y={yScale(b.boxHi)}
              width={boxW}
              height={Math.max(1, yScale(b.boxLo) - yScale(b.boxHi))}
              fill={m.color}
              fillOpacity={0.18}
              stroke={m.color}
              strokeWidth={1.5}
            />
            <line
              x1={cx - boxW / 2}
              x2={cx + boxW / 2}
              y1={yScale(b.mid)}
              y2={yScale(b.mid)}
              stroke={m.color}
              strokeWidth={2.4}
            />
          </g>
        )
      })}
    </>
  )
}

export default DistributionChart

"use client"

/**
 * MonthlyBandChart — small multiples of the monthly pattern (decision #4).
 *
 * One mini-panel per member: the median line with a filled p10–p90 band over the
 * 12 water-year months (Oct→Sep). Filled bands overlap and muddy each other once
 * there are several members, so small multiples read more clearly than an
 * overlay. Shared y-axis across panels so heights are comparable. SYNTHETIC for
 * now (the sidecar carries annual series only).
 */

import React, { useMemo } from "react"
import { ticks } from "@repo/viz"
import { WATER_YEAR_MONTHS } from "../config/inDepthVariables"
import type { ChartMember } from "../data/inDepthDataSource"
import { AXIS, fmt, GRID, TEXT } from "./chartFormat"

export interface MonthlyBandChartProps {
  members: ChartMember[]
  unit: string
}

const PW = 250
const PH = 168
const M = { top: 14, right: 12, bottom: 26, left: 54 }
const X_LABEL_MONTHS = [0, 3, 6, 9] // Oct, Jan, Apr, Jul

const MonthlyBandChart: React.FC<MonthlyBandChartProps> = React.memo(
  ({ members, unit }) => {
    const withBands = members.filter((m) => m.monthlyBands?.length === 12)

    const { lo, hi } = useMemo(() => {
      let lo = Infinity
      let hi = -Infinity
      withBands.forEach((m) => {
        m.monthlyBands!.forEach((b) => {
          lo = Math.min(lo, b.p10)
          hi = Math.max(hi, b.p90)
        })
      })
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
        lo = 0
        hi = 1
      }
      if (lo > 0 && lo / hi < 0.25) lo = 0
      hi = hi * 1.05
      if (lo === hi) hi = lo + 1
      return { lo, hi }
    }, [withBands])

    const yTicks = useMemo(() => ticks(lo, hi, 4), [lo, hi])

    if (withBands.length === 0) return null

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {withBands.map((m) => (
          <MiniBand
            key={m.key}
            member={m}
            lo={lo}
            hi={hi}
            yTicks={yTicks}
            unit={unit}
          />
        ))}
      </div>
    )
  },
)

MonthlyBandChart.displayName = "MonthlyBandChart"

interface MiniBandProps {
  member: ChartMember
  lo: number
  hi: number
  yTicks: number[]
  unit: string
}

const MiniBand: React.FC<MiniBandProps> = ({
  member,
  lo,
  hi,
  yTicks,
  unit,
}) => {
  const bands = member.monthlyBands!
  const left = M.left
  const right = PW - M.right
  const top = M.top
  const bottom = PH - M.bottom
  const x = (mth: number) => left + (mth / 11) * (right - left)
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top)

  const bandPath =
    "M" +
    bands
      .map((b, i) => `${x(i).toFixed(1)},${y(b.p90).toFixed(1)}`)
      .join(" L") +
    " L" +
    bands
      .map(
        (b, i) => `${x(11 - i).toFixed(1)},${y(bands[11 - i]!.p10).toFixed(1)}`,
      )
      .join(" L") +
    " Z"
  const medianPts = bands
    .map((b, i) => `${x(i).toFixed(1)},${y(b.p50).toFixed(1)}`)
    .join(" ")

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: member.color,
          fontWeight: 500,
          marginBottom: 2,
        }}
      >
        {member.label}
      </div>
      <svg width={PW} height={PH} style={{ display: "block" }}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text
              x={left - 6}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              fill={TEXT}
            >
              {fmt(t, unit)}
            </text>
          </g>
        ))}
        <line x1={left} x2={right} y1={bottom} y2={bottom} stroke={AXIS} />
        {/* compact y-axis unit (small multiples share one scale) */}
        {unit && (
          <text
            x={12}
            y={(top + bottom) / 2}
            transform={`rotate(-90 12 ${(top + bottom) / 2})`}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill={TEXT}
          >
            {unit}
          </text>
        )}
        <path
          d={bandPath}
          fill={member.color}
          fillOpacity={0.16}
          stroke="none"
        />
        <polyline
          points={medianPts}
          fill="none"
          stroke={member.color}
          strokeWidth={2}
        />
        {X_LABEL_MONTHS.map((mth) => (
          <text
            key={mth}
            x={x(mth)}
            y={bottom + 14}
            textAnchor="middle"
            fontSize={10}
            fill={TEXT}
          >
            {WATER_YEAR_MONTHS[mth]}
          </text>
        ))}
      </svg>
    </div>
  )
}

export default MonthlyBandChart

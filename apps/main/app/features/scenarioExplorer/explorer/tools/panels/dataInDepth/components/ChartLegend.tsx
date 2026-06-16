"use client"

/**
 * ChartLegend — a shared, in-SVG legend for the In-Depth charts.
 *
 * Drawn as SVG (not HTML) on purpose: the figures can be exported to SVG
 * (see utils/inDepthChartExport.ts), and an in-SVG legend travels with the
 * exported file. One colour swatch + member label per entry, greedy-wrapped
 * across as many rows as the width needs.
 *
 * Row height is fixed, so a chart can reserve vertical space up front with
 * `legendHeight(items, width)` and then render `<ChartLegend>` into that strip.
 * Item widths are estimated from label length (we can't measure text inside a
 * declarative SVG without a DOM round-trip); the estimate is deliberately a
 * little generous so labels don't collide.
 */

import React from "react"
import { TEXT } from "./chartFormat"

export interface LegendItem {
  key: string
  label: string
  color: string
}

const SWATCH = 12
const ROW_H = 18
const ITEM_GAP = 18
const SWATCH_GAP = 6
const FONT = 11
const CHAR_W = 6.4 // approximate average glyph advance at FONT px

function itemWidth(label: string): number {
  return SWATCH + SWATCH_GAP + label.length * CHAR_W
}

/** Greedy-wrap the items into rows that each fit within `width`. */
export function legendRows(items: LegendItem[], width: number): LegendItem[][] {
  const rows: LegendItem[][] = []
  let row: LegendItem[] = []
  let x = 0
  for (const it of items) {
    const w = itemWidth(it.label) + ITEM_GAP
    if (row.length > 0 && x + w > width) {
      rows.push(row)
      row = []
      x = 0
    }
    row.push(it)
    x += w
  }
  if (row.length > 0) rows.push(row)
  return rows
}

/** Vertical space the legend will occupy at the given wrap width. */
export function legendHeight(items: LegendItem[], width: number): number {
  if (items.length === 0) return 0
  return legendRows(items, width).length * ROW_H
}

export interface ChartLegendProps {
  items: LegendItem[]
  /** Left edge the rows align to. */
  x: number
  /** Top y of the first row. */
  y: number
  /** Wrap width (usually the plot's inner width). */
  width: number
}

const ChartLegend: React.FC<ChartLegendProps> = ({ items, x, y, width }) => {
  if (items.length === 0) return null
  const rows = legendRows(items, width)
  return (
    <g>
      {rows.map((row, ri) => {
        // Pre-compute each entry's x offset within the row.
        let cx = x
        const placed = row.map((it) => {
          const ix = cx
          cx += itemWidth(it.label) + ITEM_GAP
          return { it, ix }
        })
        return (
          <g
            key={`legendrow-${ri}`}
            transform={`translate(0, ${y + ri * ROW_H})`}
          >
            {placed.map(({ it, ix }) => (
              <g key={it.key} transform={`translate(${ix}, 0)`}>
                <rect
                  x={0}
                  y={2}
                  width={SWATCH}
                  height={SWATCH}
                  rx={2}
                  fill={it.color}
                />
                <text
                  x={SWATCH + SWATCH_GAP}
                  y={2 + SWATCH / 2}
                  dominantBaseline="central"
                  fontSize={FONT}
                  fill={TEXT}
                >
                  {it.label}
                </text>
              </g>
            ))}
          </g>
        )
      })}
    </g>
  )
}

export default ChartLegend

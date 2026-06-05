import type { Seat } from '../types'
import { rowLabel, seatLabel, type RowLabelMode } from './labels'

export type DraftSeat = Omit<Seat, 'id' | 'productId'>

export interface GridParams {
  rows: number
  cols: number
  startX: number
  startY: number
  xSpacing: number
  ySpacing: number
  prefix: string
  rowMode: RowLabelMode
  rowStart: string // 'A' or '1'
  seatStart: number // first seat number in each row
}

/** A rectangular block of seats, labelled row-by-row. */
export function generateGrid(p: GridParams): DraftSeat[] {
  const seats: DraftSeat[] = []
  for (let r = 0; r < p.rows; r++) {
    const row = rowLabel(r, p.rowMode, p.rowStart)
    for (let c = 0; c < p.cols; c++) {
      seats.push({
        label: seatLabel(p.prefix, row, p.seatStart + c),
        x: Math.round(p.startX + c * p.xSpacing),
        y: Math.round(p.startY + r * p.ySpacing),
      })
    }
  }
  return seats
}

export interface RowParams {
  count: number
  startX: number
  startY: number
  spacing: number
  prefix: string
  row: string
  seatStart: number
  angleDeg: number // rotate the whole row around its start point
}

/** A single straight row of seats (optionally angled). */
export function generateRow(p: RowParams): DraftSeat[] {
  const seats: DraftSeat[] = []
  const rad = (p.angleDeg * Math.PI) / 180
  const dx = Math.cos(rad) * p.spacing
  const dy = Math.sin(rad) * p.spacing
  for (let i = 0; i < p.count; i++) {
    seats.push({
      label: seatLabel(p.prefix, p.row, p.seatStart + i),
      x: Math.round(p.startX + dx * i),
      y: Math.round(p.startY + dy * i),
    })
  }
  return seats
}

export interface ArcParams {
  count: number
  centerX: number
  centerY: number
  radius: number
  startAngleDeg: number
  endAngleDeg: number
  prefix: string
  row: string
  seatStart: number
  faceOutward: boolean // unused for placement, reserved for future rotation
}

export interface ArcBlockParams {
  centerX: number
  centerY: number
  baseRadius: number
  rowGap: number
  rows: number
  cols: number
  startAngleDeg: number
  endAngleDeg: number
  prefix: string
  rowStart: string
  seatStart: number
}

/** A concentric block of arc rows: `rows` arcs at increasing radius, each
 *  with `cols` seats placed along the same set of angles (radial columns). */
export function generateArcBlock(p: ArcBlockParams): DraftSeat[] {
  const seats: DraftSeat[] = []
  const a0 = (p.startAngleDeg * Math.PI) / 180
  const a1 = (p.endAngleDeg * Math.PI) / 180
  const step = p.cols > 1 ? (a1 - a0) / (p.cols - 1) : 0
  for (let r = 0; r < p.rows; r++) {
    const radius = p.baseRadius + r * p.rowGap
    const row = rowLabel(r, 'alpha', p.rowStart)
    for (let c = 0; c < p.cols; c++) {
      const a = p.cols > 1 ? a0 + step * c : (a0 + a1) / 2
      seats.push({
        label: seatLabel(p.prefix, row, p.seatStart + c),
        x: Math.round(p.centerX + Math.cos(a) * radius),
        y: Math.round(p.centerY + Math.sin(a) * radius),
      })
    }
  }
  return seats
}

/** A curved row: seats spaced evenly along an arc. */
export function generateArc(p: ArcParams): DraftSeat[] {
  const seats: DraftSeat[] = []
  const a0 = (p.startAngleDeg * Math.PI) / 180
  const a1 = (p.endAngleDeg * Math.PI) / 180
  const step = p.count > 1 ? (a1 - a0) / (p.count - 1) : 0
  for (let i = 0; i < p.count; i++) {
    const a = a0 + step * i
    seats.push({
      label: seatLabel(p.prefix, p.row, p.seatStart + i),
      x: Math.round(p.centerX + Math.cos(a) * p.radius),
      y: Math.round(p.centerY + Math.sin(a) * p.radius),
    })
  }
  return seats
}

import type { ArcBlock, FloorElement, Label, Plan, Product, Seat } from '../types'
import { generateArcBlock, generateGrid } from './seatGenerators'
import { brighten, defaultConfiguration } from '../store/useDesignerStore'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const product = (numId: number, name: string, color: string, radius = 13): Product => ({
  id: uid(),
  numId,
  name,
  color,
  selectedColor: brighten(color),
  radius,
})

/**
 * A complete, editable example auditorium: a VIP front block, a stalls grid,
 * a concentric circle (arc) block, a stage with side walls, section labels,
 * and a canvas colour. Everything is normal designer data, so it can be moved,
 * recolored, relabeled, resized, etc. with the on-screen tools.
 */
export function buildExamplePlan(): Plan {
  const vip = product(1, 'VIP', '#e39012')
  const stalls = product(2, 'Stalls', '#2d9c6c')
  const circle = product(3, 'Circle', '#958dc2')
  const products = [vip, stalls, circle]

  const seats: Seat[] = []

  // VIP — two short rows right under the stage (labels VA1.., VB1..)
  for (const d of generateGrid({
    rows: 2, cols: 12, startX: 470, startY: 150, xSpacing: 40, ySpacing: 40,
    prefix: 'V', rowMode: 'alpha', rowStart: 'A', seatStart: 1,
  })) {
    seats.push({ id: uid(), label: d.label, x: d.x, y: d.y, productId: vip.id })
  }

  // Stalls — main flat block (rows A..H, seats 1..16)
  for (const d of generateGrid({
    rows: 8, cols: 16, startX: 400, startY: 260, xSpacing: 40, ySpacing: 40,
    prefix: '', rowMode: 'alpha', rowStart: 'A', seatStart: 1,
  })) {
    seats.push({ id: uid(), label: d.label, x: d.x, y: d.y, productId: stalls.id })
  }

  // Circle — a concentric arc block (drag its radius handle on the canvas)
  const arc: ArcBlock = {
    id: uid(),
    centerX: 700, centerY: 1170, baseRadius: 430, rowGap: 40,
    rows: 4, cols: 20, startAngleDeg: 214, endAngleDeg: 326,
    prefix: 'C', rowStart: 'A', seatStart: 1, productId: circle.id,
  }
  for (const d of generateArcBlock(arc)) {
    seats.push({ id: uid(), label: d.label, x: d.x, y: d.y, productId: circle.id, arcId: arc.id })
  }

  const floorElements: FloorElement[] = [
    { id: uid(), type: 'stage', x: 450, y: 50, width: 500, height: 64, rotation: 0,
      fill: '#1e293b', stroke: '#0f172a', strokeWidth: 2, label: 'STAGE', fontSize: 26 },
    { id: uid(), type: 'line', x: 372, y: 130, width: 0, height: 640, points: [0, 0, 0, 640],
      rotation: 0, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 3, label: '', fontSize: 18 },
    { id: uid(), type: 'line', x: 1028, y: 130, width: 0, height: 640, points: [0, 0, 0, 640],
      rotation: 0, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 3, label: '', fontSize: 18 },
  ]

  const labels: Label[] = [
    { id: uid(), text: 'STALLS', x: 700, y: 225, color: '#0f172a', fontFamily: 'sans-serif',
      fontSize: 22, bold: true, italic: false, align: 'center', rotation: 0, row: false },
    { id: uid(), text: 'CIRCLE', x: 700, y: 590, color: '#5b4bb3', fontFamily: 'Georgia',
      fontSize: 22, bold: true, italic: false, align: 'center', rotation: 0, row: false },
  ]

  return {
    id: uid(),
    name: 'Example Auditorium',
    configuration: {
      ...defaultConfiguration(),
      width: 1400,
      height: 1280,
      canvasColor: '#f1f5f9',
      seatRadius: 13,
      seatLabelSize: 9,
    },
    products,
    seats,
    floorElements,
    labels,
    arcBlocks: [arc],
  }
}

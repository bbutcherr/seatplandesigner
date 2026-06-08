import type { ArcBlock, FloorElement, Label, Plan, Product, Seat, Zone } from '../types'
import { generateArcBlock, generateGrid } from './seatGenerators'
import { brighten, defaultConfiguration } from '../store/useDesignerStore'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const product = (
  numId: number,
  name: string,
  color: string,
  radius = 13,
  selectedColor?: string,
): Product => ({
  id: uid(),
  numId,
  name,
  color,
  selectedColor: selectedColor ?? brighten(color),
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
    zones: [],
  }
}

/**
 * A rich festival template: 500 curved seats in a fan facing the stage, as four
 * concentric arc sections — VIP (closest) / Premium / Standard / Students
 * (furthest, the last 3 rows). Radial blue→black gradient and many floor
 * elements (main stage, DJ booth, themed food stalls, bars, WC, entrance).
 */
export function buildFestivalPlan(): Plan {
  const vip = product(1, 'VIP', '#e39012', 15, '#ffb84d')
  const premium = product(2, 'Premium', '#f582b2', 14, '#ff4fa0')
  const standard = product(3, 'Standard', '#34d399', 13, '#10b981')
  const students = product(4, 'Students', '#60a5fa', 12, '#2563eb')
  const products = [vip, premium, standard, students]

  // Concentric curved sections sharing one focal centre above the stage.
  // The fan is shifted right (cx) with extra width so the left-side section
  // labels have margin and don't run off the canvas edge.
  const W = 1860
  const H = 1480
  const cx = 1000
  const cy = -370 // focal point above the canvas → rows fan downward
  const cols = 25
  const gap = 40
  const startAngle = 60
  const endAngle = 120
  const sections: { name: string; product: Product; rows: number }[] = [
    { name: 'VIP', product: vip, rows: 3 },
    { name: 'PREMIUM', product: premium, rows: 4 },
    { name: 'STANDARD', product: standard, rows: 10 },
    { name: 'STUDENTS', product: students, rows: 3 },
  ]

  const seats: Seat[] = []
  const arcBlocks: ArcBlock[] = []
  const labels: Label[] = []
  let baseRadius = 820
  let rowOffset = 0
  for (const sec of sections) {
    const block: ArcBlock = {
      id: uid(), centerX: cx, centerY: cy, baseRadius, rowGap: gap,
      rows: sec.rows, cols, startAngleDeg: startAngle, endAngleDeg: endAngle,
      prefix: '', rowStart: String.fromCharCode(65 + rowOffset), seatStart: 1,
      productId: sec.product.id,
    }
    arcBlocks.push(block)
    for (const d of generateArcBlock(block)) {
      seats.push({ id: uid(), label: d.label, x: d.x, y: d.y, productId: sec.product.id, arcId: block.id })
    }
    // section label just outside the left end of the section, at its mid radius
    const midR = baseRadius + ((sec.rows - 1) / 2) * gap
    const a = (endAngle * Math.PI) / 180
    labels.push({
      id: uid(), text: sec.name,
      x: Math.round(cx + Math.cos(a) * midR - 28),
      y: Math.round(cy + Math.sin(a) * midR),
      color: '#e2e8f0', fontFamily: 'sans-serif', fontSize: 20,
      bold: true, italic: false, align: 'right', rotation: 0, row: false,
    })
    baseRadius += sec.rows * gap
    rowOffset += sec.rows
  }

  const stageW = 620
  const stalls = [
    { name: 'Burgers', fill: '#f59e0b' },
    { name: 'Pizza', fill: '#ef4444' },
    { name: 'Drinks', fill: '#3b82f6' },
    { name: 'Tacos', fill: '#22c55e' },
    { name: 'Coffee', fill: '#a16207' },
  ]
  const floorElements: FloorElement[] = [
    { id: uid(), type: 'stage', x: (W - stageW) / 2, y: 60, width: stageW, height: 78, rotation: 0, fill: '#111827', stroke: '#0ea5e9', strokeWidth: 3, label: 'MAIN STAGE', fontSize: 30 },
    { id: uid(), type: 'circle', x: cx - 46, y: 190, width: 92, height: 92, rotation: 0, fill: '#fde68a', stroke: '#d97706', strokeWidth: 3, label: 'DJ', fontSize: 20 },
    ...stalls.map((s, i): FloorElement => ({ id: uid(), type: 'rect', x: 220 + i * 290, y: 1280, width: 220, height: 86, rotation: 0, fill: s.fill, stroke: '#0f172a', strokeWidth: 2, label: s.name, fontSize: 20 })),
    { id: uid(), type: 'rect', x: 40, y: 180, width: 90, height: 320, rotation: 0, fill: '#475569', stroke: '#1e293b', strokeWidth: 2, label: 'BAR', fontSize: 20 },
    { id: uid(), type: 'rect', x: 1730, y: 180, width: 90, height: 320, rotation: 0, fill: '#475569', stroke: '#1e293b', strokeWidth: 2, label: 'BAR', fontSize: 20 },
    { id: uid(), type: 'rect', x: 40, y: 1280, width: 90, height: 86, rotation: 0, fill: '#94a3b8', stroke: '#475569', strokeWidth: 2, label: 'WC', fontSize: 18 },
    { id: uid(), type: 'text', x: 900, y: 1420, width: 200, height: 30, rotation: 0, fill: '#e2e8f0', stroke: '#e2e8f0', strokeWidth: 1, label: 'ENTRANCE →', fontSize: 24 },
  ]

  return {
    id: uid(),
    name: 'Summer Festival',
    configuration: {
      ...defaultConfiguration(),
      width: W,
      height: H,
      canvasColor: '#1e3a8a', // blue glow in the centre…
      canvasColor2: '#020617', // …fading to near-black at the edges
      canvasGradient: 'radial',
      seatRadius: 13,
      seatLabelSize: 9,
      showSeatLabels: true,
    },
    products,
    seats,
    floorElements,
    labels,
    arcBlocks,
    zones: [],
  }
}

/**
 * A film hall: a curved SCREEN up front, a grid main floor split into 3 column
 * blocks (left / centre / right) with aisles — front 3 rows Premium, the rest
 * Standard — a row of Boxes behind it, a curved demarcation, and a gently
 * curved Balcony across the back. 800 seats (448 floor + 72 boxes + 280 balcony).
 */
export function buildFilmHallPlan(): Plan {
  const premium = product(1, 'Premium', '#e39012', 13, '#ffb84d')
  const standard = product(2, 'Standard', '#2d9c6c', 12, '#1bde14')
  const box = product(3, 'Box', '#a855f7', 12, '#7c3aed')
  const balcony = product(4, 'Balcony', '#3b82f6', 11, '#1d4ed8')
  const products = [premium, standard, balcony, box].sort((a, b) => a.numId - b.numId)

  const W = 1800
  const H = 1320
  const seats: Seat[] = []
  const arcBlocks: ArcBlock[] = []
  const floorElements: FloorElement[] = []

  // ---- main floor: 3 column blocks (front 3 rows Premium, rest Standard) ----
  const dx = 34
  const dy = 36
  const rowsMain = 14
  const startY = 180
  const blocks = [
    { x0: 343, cols: 8, prefix: 'L' },
    { x0: 645, cols: 16, prefix: 'C' },
    { x0: 1219, cols: 8, prefix: 'R' },
  ]
  for (const b of blocks) {
    for (let r = 0; r < rowsMain; r++) {
      const rowName = String.fromCharCode(65 + r)
      const pid = r < 3 ? premium.id : standard.id
      for (let c = 0; c < b.cols; c++) {
        seats.push({ id: uid(), label: `${b.prefix}${rowName}${c + 1}`, x: b.x0 + c * dx, y: startY + r * dy, productId: pid })
      }
    }
  }

  // ---- boxes: a row of 8 boxes behind the floor (3×3 each) ----
  for (let i = 0; i < 8; i++) {
    const x0 = 130 + i * 195
    const by = 685
    floorElements.push({ id: uid(), type: 'rect', x: x0, y: by, width: 96, height: 96, rotation: 0, fill: '#c4b5fd', stroke: '#7c3aed', strokeWidth: 2, label: `B${i + 1}`, fontSize: 14 })
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        seats.push({ id: uid(), label: `B${i + 1}-${r * 3 + c + 1}`, x: x0 + 18 + c * 30, y: by + 18 + r * 30, productId: box.id })
  }

  // ---- balcony: a gently curved block across the back ----
  const balconyBlock: ArcBlock = { id: uid(), centerX: 900, centerY: -550, baseRadius: 1450, rowGap: 34, rows: 8, cols: 35, startAngleDeg: 70, endAngleDeg: 110, prefix: 'BL', rowStart: 'A', seatStart: 1, productId: balcony.id }
  arcBlocks.push(balconyBlock)
  for (const d of generateArcBlock(balconyBlock))
    seats.push({ id: uid(), label: d.label, x: d.x, y: d.y, productId: balcony.id, arcId: balconyBlock.id })

  // ---- floor: screen, aisles, a curved demarcation ----
  const arcPts: number[] = []
  const aw = 1100
  const ah = 40
  for (let i = 0; i <= 28; i++) {
    const a = Math.PI + (Math.PI * i) / 28
    arcPts.push(Math.round(aw / 2 + (aw / 2) * Math.cos(a)), Math.round(ah / 2 + (ah / 2) * Math.sin(a)))
  }
  floorElements.unshift(
    { id: uid(), type: 'stage', x: 400, y: 48, width: 1000, height: 56, rotation: 0, fill: '#0f172a', stroke: '#334155', strokeWidth: 2, label: 'SCREEN', fontSize: 30 },
    { id: uid(), type: 'line', x: 613, y: 165, width: 0, height: 500, points: [0, 0, 0, 500], rotation: 0, fill: '#e2e8f0', stroke: '#475569', strokeWidth: 2, label: '', fontSize: 18 },
    { id: uid(), type: 'line', x: 1187, y: 165, width: 0, height: 500, points: [0, 0, 0, 500], rotation: 0, fill: '#e2e8f0', stroke: '#475569', strokeWidth: 2, label: '', fontSize: 18 },
    { id: uid(), type: 'arc', x: (W - aw) / 2, y: 790, width: aw, height: ah, rotation: 0, fill: '#64748b', stroke: '#64748b', strokeWidth: 3, label: '', points: arcPts, fontSize: 18 },
  )

  const sect = (text: string, y: number): Label => ({ id: uid(), text, x: 320, y, color: '#e2e8f0', fontFamily: 'sans-serif', fontSize: 22, bold: true, italic: false, align: 'right', rotation: 0, row: false })
  const labels: Label[] = [sect('PREMIUM', 216), sect('STANDARD', 468), sect('BOXES', 718), sect('BALCONY', 980)]

  return {
    id: uid(),
    name: 'Film Hall',
    configuration: {
      ...defaultConfiguration(),
      width: W,
      height: H,
      canvasColor: '#111827',
      canvasColor2: '#020617',
      canvasGradient: 'radial',
      seatRadius: 12,
      seatLabelSize: 8,
      showSeatLabels: true,
    },
    products,
    seats,
    floorElements,
    labels,
    arcBlocks,
    zones: [],
  }
}

/**
 * A banquet layout: a 100-seat main floor (front 3 rows Premium, rest Standard)
 * with round Tables down both sides — 4 tables per side, 4 seats each (32 table
 * seats, labelled TA1…, TB1…). Three ticket types: Premium, Standard, Tables.
 * Same dark floor colour as the film hall.
 */
export function buildBanquetPlan(): Plan {
  const premium = product(1, 'Premium', '#e39012', 13, '#ffb84d')
  const standard = product(2, 'Standard', '#34d399', 12, '#10b981')
  // one product per table (Table A … Table H), each a distinct colour
  const tableDefs = [
    { L: 'A', x: 100, y: 180 }, { L: 'B', x: 100, y: 330 }, { L: 'C', x: 100, y: 480 }, { L: 'D', x: 100, y: 630 },
    { L: 'E', x: 660, y: 180 }, { L: 'F', x: 660, y: 330 }, { L: 'G', x: 660, y: 480 }, { L: 'H', x: 660, y: 630 },
  ]
  const tableColors = ['#f472b6', '#fb923c', '#a78bfa', '#22d3ee', '#facc15', '#f87171', '#c084fc', '#2dd4bf']
  const tableProducts = tableDefs.map((t, i) => product(3 + i, `Table ${t.L}`, tableColors[i], 12))
  const products = [premium, standard, ...tableProducts]

  const W = 760
  const H = 720
  const seats: Seat[] = []
  const floorElements: FloorElement[] = []

  // central 10×10 main floor — front 3 rows Premium, the rest Standard (100)
  const dx = 40
  const dy = 40
  const startX = 200
  const startY = 150
  for (let r = 0; r < 10; r++) {
    const rowName = String.fromCharCode(65 + r) // A..J
    const pid = r < 3 ? premium.id : standard.id
    for (let c = 0; c < 10; c++) {
      seats.push({ id: uid(), label: `${rowName}${c + 1}`, x: startX + c * dx, y: startY + r * dy, productId: pid })
    }
  }

  // round tables down both sides — 4 per side, 4 seats each, each table its own
  // product. Seats labelled TA-1…TA-4, TB-1…, etc.
  tableDefs.forEach((t, i) => {
    floorElements.push({ id: uid(), type: 'circle', x: t.x - 30, y: t.y - 30, width: 60, height: 60, rotation: 0, fill: '#cbd5e1', stroke: '#64748b', strokeWidth: 2, label: t.L, fontSize: 20 })
    for (let j = 0; j < 4; j++) {
      const a = ((45 + j * 90) * Math.PI) / 180 // 4 chairs around the table
      seats.push({ id: uid(), label: `T${t.L}-${j + 1}`, x: Math.round(t.x + 50 * Math.cos(a)), y: Math.round(t.y + 50 * Math.sin(a)), productId: tableProducts[i].id })
    }
  })

  const lbl = (text: string, x: number, y: number, align: 'left' | 'center' | 'right'): Label => ({ id: uid(), text, x, y, color: '#e2e8f0', fontFamily: 'sans-serif', fontSize: 20, bold: true, italic: false, align, rotation: 0, row: false })
  const labels: Label[] = [
    lbl('PREMIUM', startX + 5 * dx, startY - 30, 'center'),
    lbl('STANDARD', startX + 5 * dx, startY + 10 * dy + 6, 'center'),
    lbl('TABLES', 100, 110, 'center'),
    lbl('TABLES', 660, 110, 'center'),
  ]

  return {
    id: uid(),
    name: 'Banquet — side tables',
    configuration: {
      ...defaultConfiguration(),
      width: W,
      height: H,
      canvasColor: '#111827',
      canvasColor2: '#020617',
      canvasGradient: 'radial',
      seatRadius: 12,
      seatLabelSize: 8,
      showSeatLabels: true,
    },
    products,
    seats,
    floorElements,
    labels,
    arcBlocks: [],
    zones: [],
  }
}

/**
 * A garden event: a trapezoid that is narrow at the front (where the stage is)
 * and widens toward the back — each row has more seats than the one in front.
 * Three depth tiers (front VIP → Premium → Standard at the wide back), with
 * food stalls across the back and toilets on each side.
 */
export function buildGardenPlan(): Plan {
  const vip = product(1, 'VIP', '#e39012', 14, '#ffb84d')
  const premium = product(2, 'Premium', '#f472b6', 13, '#ec4899')
  const standard = product(3, 'Standard', '#34d399', 12, '#10b981')
  const products = [vip, premium, standard]

  const W = 1500
  const H = 1140
  const floorElements: FloorElement[] = []

  // Three trapezoid AREA zones (no individual seats) — narrow at the front,
  // widening to the back. Each zone is one bookable region with a capacity.
  const centerX = 750
  const hw = (y: number) => 180 + (340 * (y - 170)) / 700 // half-width at depth y
  const band = (y0: number, y1: number) =>
    [centerX - hw(y0), y0, centerX + hw(y0), y0, centerX + hw(y1), y1, centerX - hw(y1), y1].map(Math.round)
  const zones: Zone[] = [
    { id: uid(), label: 'VIP', points: band(170, 330), color: vip.color, productId: vip.id, capacity: 60 },
    { id: uid(), label: 'PREMIUM', points: band(330, 530), color: premium.color, productId: premium.id, capacity: 140 },
    { id: uid(), label: 'STANDARD', points: band(530, 870), color: standard.color, productId: standard.id, capacity: 300 },
  ]

  // stage at the narrow front
  floorElements.push({ id: uid(), type: 'stage', x: centerX - 200, y: 40, width: 400, height: 64, rotation: 0, fill: '#0f172a', stroke: '#334155', strokeWidth: 2, label: 'STAGE', fontSize: 30 })
  // toilets on each side
  floorElements.push({ id: uid(), type: 'rect', x: 60, y: 420, width: 92, height: 150, rotation: 0, fill: '#bfdbfe', stroke: '#1e3a8a', strokeWidth: 2, label: 'WC', fontSize: 22 })
  floorElements.push({ id: uid(), type: 'rect', x: W - 152, y: 420, width: 92, height: 150, rotation: 0, fill: '#bfdbfe', stroke: '#1e3a8a', strokeWidth: 2, label: 'WC', fontSize: 22 })
  // food stalls across the (wide) back
  const stalls = [
    { name: 'Burgers', fill: '#f59e0b' }, { name: 'Pizza', fill: '#ef4444' }, { name: 'Bar', fill: '#3b82f6' },
    { name: 'Coffee', fill: '#a16207' }, { name: 'Sweets', fill: '#22c55e' },
  ]
  stalls.forEach((s, i) => floorElements.push({ id: uid(), type: 'rect', x: 250 + i * 210, y: 970, width: 180, height: 86, rotation: 0, fill: s.fill, stroke: '#0f172a', strokeWidth: 2, label: s.name, fontSize: 18 }))

  return {
    id: uid(),
    name: 'Garden event',
    configuration: {
      ...defaultConfiguration(),
      width: W,
      height: H,
      canvasColor: '#166534',
      canvasColor2: '#052e16',
      canvasGradient: 'radial',
      seatRadius: 12,
      seatLabelSize: 8,
      showSeatLabels: true,
    },
    products,
    seats: [],
    floorElements,
    labels: [],
    arcBlocks: [],
    zones,
  }
}

/** Ready-made templates for the top-bar dropdown. */
export const TEMPLATES: { id: string; name: string; build: () => Plan }[] = [
  { id: 'example', name: 'Example auditorium', build: buildExamplePlan },
  { id: 'festival', name: 'Festival — 500 seats', build: buildFestivalPlan },
  { id: 'filmhall', name: 'Film hall — 800 seats', build: buildFilmHallPlan },
  { id: 'banquet', name: 'Banquet — side tables', build: buildBanquetPlan },
  { id: 'garden', name: 'Garden event — tiered', build: buildGardenPlan },
]

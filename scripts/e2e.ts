import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle, bundleToJson } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { generateGrid, generateRow } from '../src/lib/seatGenerators'
import type { ExportedBundle } from '../src/types'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()
const FIXED = new Date('2026-06-05T12:00:00.000Z')

// ─────────────────────────────────────────────────────────────────────────
// Build a canvas using all the features (the same store actions the UI calls)
// ─────────────────────────────────────────────────────────────────────────
st().setSourceEvent('Grand Gala 2026')

// Plan 1 — config: size, gradient shade, seat/text size, background, auto-zoom
st().updateConfig({
  width: 1600, height: 1200,
  canvasColor: '#0f172a', canvasColor2: '#1e3a5f', canvasGradient: 'radial',
  seatRadius: 14, seatLabelSize: 10, showSeatLabels: true,
  backgroundUrl: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4',
  autoZoomEnabled: true, autoZoomLevel: 6, autoZoomTarget: 'horizontal',
})
st().renamePlan(st().project.activePlanId, 'Main Hall')

// Ticket types with distinct colours + per-type seat sizes
const stallsId = st().activePlan().products[0].id
st().updateProduct(stallsId, { name: 'Stalls', color: '#2d9c6c', selectedColor: '#1bde14', radius: 14 })
st().addProduct('VIP')
const vipId = st().activeProductId
st().updateProduct(vipId, { color: '#e39012', selectedColor: '#a16100', radius: 20 })
st().addProduct('Table')
const tableId = st().activeProductId
st().updateProduct(tableId, { color: '#958dc2', selectedColor: '#5b4bb3', radius: 30 })

// Seats: a grid (Stalls) + a straight row (VIP) + an arc block (Table)
st().setActiveProduct(stallsId)
st().addSeats(generateGrid({ rows: 6, cols: 14, startX: 300, startY: 300, xSpacing: 40, ySpacing: 42, prefix: '', rowMode: 'alpha', rowStart: 'A', seatStart: 1 }))
st().setActiveProduct(vipId)
st().addSeats(generateRow({ count: 10, startX: 320, startY: 220, spacing: 44, prefix: 'V', row: 'A', seatStart: 1, angleDeg: 0 }))
st().setActiveProduct(tableId)
st().createArcBlock({ centerX: 800, centerY: 1300, baseRadius: 520, rowGap: 46, rows: 3, cols: 18, startAngleDeg: 214, endAngleDeg: 326, prefix: 'C', rowStart: 'A', seatStart: 1 })
const arcId = st().selectedArcId!
st().updateArcBlockRadius(arcId, 560) // exercise the radius transform

// Floor elements: stage, block, wall (line w/ points), circle, text
st().addFloorElement({ type: 'stage', x: 560, y: 60, width: 480, height: 60, rotation: 0, fill: '#1e293b', stroke: '#0f172a', strokeWidth: 2, label: 'STAGE', fontSize: 26 })
st().addFloorElement({ type: 'rect', x: 80, y: 300, width: 120, height: 380, rotation: 0, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 2, label: 'BAR', fontSize: 18 })
st().addFloorElement({ type: 'line', x: 260, y: 180, width: 0, height: 560, points: [0, 0, 0, 560], rotation: 0, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 3, label: '', fontSize: 18 })
st().addFloorElement({ type: 'circle', x: 1200, y: 250, width: 90, height: 90, rotation: 0, fill: '#fde68a', stroke: '#d97706', strokeWidth: 2, label: 'DJ', fontSize: 16 })
st().addFloorElement({ type: 'text', x: 1180, y: 360, width: 160, height: 24, rotation: 0, fill: '#0f172a', stroke: '#0f172a', strokeWidth: 1, label: 'Exit →', fontSize: 20 })

// Labels: a styled free label + auto row labels (both ends)
st().addLabel({ text: 'MAIN HALL', x: 800, y: 150, color: '#f8fafc', fontFamily: 'Georgia', fontSize: 30, bold: true, italic: true, align: 'center', rotation: 0 })
st().generateRowLabels(36)

// Plan 2 — a second plan with its own settings
st().addPlan()
st().renamePlan(st().project.activePlanId, 'Balcony')
st().updateConfig({ width: 1200, height: 700, canvasGradient: 'vertical', canvasColor: '#fef3c7', canvasColor2: '#fbbf24' })
st().addSeats(generateGrid({ rows: 3, cols: 12, startX: 200, startY: 200, xSpacing: 44, ySpacing: 44, prefix: 'B', rowMode: 'alpha', rowStart: 'A', seatStart: 1 }))

// ─────────────────────────────────────────────────────────────────────────
// Capture expectations, then export → re-import → re-export
// ─────────────────────────────────────────────────────────────────────────
const before = st().project
const summary = before.plans.map((p) => ({
  name: p.name,
  seats: p.seats.length,
  products: p.products.map((x) => `${x.name}:${x.color}/${x.selectedColor}/r${x.radius}`),
  floor: p.floorElements.length,
  labels: p.labels.length,
  arcs: p.arcBlocks.length,
  gradient: `${p.configuration.canvasGradient} ${p.configuration.canvasColor}→${p.configuration.canvasColor2}`,
  size: `${p.configuration.width}x${p.configuration.height}`,
}))

const b1 = projectToBundle(before, FIXED)
const reimported = bundleToProject(b1)
const b2 = projectToBundle(reimported, FIXED)

// 1) Idempotent round-trip: export == import-then-export (normalize arc uids)
function normalize(b: ExportedBundle): string {
  const c = JSON.parse(JSON.stringify(b))
  for (const plan of c.plans) {
    const map = new Map<string, string>()
    plan.arc_blocks.forEach((blk: { id: string }, i: number) => { map.set(blk.id, `arc#${i}`); blk.id = `arc#${i}` })
    for (const s of plan.seats) if (s.arc_id) s.arc_id = map.get(s.arc_id) ?? s.arc_id
  }
  return JSON.stringify(c, null, 2)
}
const n1 = normalize(b1)
const n2 = normalize(b2)
eq(n1 === n2, 'export → import → export is identical (faithful round-trip)')
if (n1 !== n2) {
  const a = n1.split('\n'), bb = n2.split('\n')
  for (let i = 0; i < Math.max(a.length, bb.length); i++) {
    if (a[i] !== bb[i]) { errors.push(`  first diff @line ${i}:\n    B1: ${a[i]}\n    B2: ${bb[i]}`); break }
  }
}

// 2) Re-imported plans match the originals feature-by-feature
eq(reimported.sourceEvent === 'Grand Gala 2026', 'source event preserved')
eq(reimported.plans.length === 2, `plan count ${reimported.plans.length}`)
const p1 = reimported.plans[0]
const exp1 = before.plans[0]
eq(p1.seats.length === exp1.seats.length, `plan1 seats ${p1.seats.length} vs ${exp1.seats.length}`)
eq(p1.floorElements.length === 5, `plan1 floor elements ${p1.floorElements.length} (want 5)`)
eq(p1.floorElements.some((f) => f.type === 'line' && JSON.stringify(f.points) === JSON.stringify([0, 0, 0, 560])), 'wall line points preserved')
eq(p1.labels.length === exp1.labels.length, `plan1 labels ${p1.labels.length} vs ${exp1.labels.length}`)
eq(p1.labels.some((l) => l.text === 'MAIN HALL' && l.fontFamily === 'Georgia' && l.bold && l.italic), 'styled free label preserved')
eq(p1.labels.filter((l) => l.row).length > 0, 'row labels preserved')
eq(p1.arcBlocks.length === 1 && p1.arcBlocks[0].baseRadius === 560, `arc block + transformed radius (${p1.arcBlocks[0]?.baseRadius})`)
eq(p1.seats.filter((s) => s.arcId === p1.arcBlocks[0].id).length === 3 * 18, 'arc seats re-linked to block')
eq(p1.configuration.canvasGradient === 'radial' && p1.configuration.canvasColor2 === '#1e3a5f', 'gradient shade preserved')
eq(p1.configuration.backgroundUrl.startsWith('data:'), 'embedded background preserved')
eq(p1.configuration.seatLabelSize === 10 && p1.configuration.width === 1600, 'config (text size, width) preserved')

// product fidelity by NAME (catches any colour/size mis-mapping)
for (const want of exp1.products) {
  const got = p1.products.find((x) => x.name === want.name)
  eq(!!got && got.color === want.color && got.selectedColor === want.selectedColor && got.radius === want.radius,
    `product "${want.name}" colour/size preserved (got ${got?.color}/${got?.selectedColor}/r${got?.radius})`)
}

// plan 2 fidelity
const p2 = reimported.plans[1]
eq(p2.name === 'Balcony' && p2.configuration.canvasGradient === 'vertical' && p2.seats.length === 36, 'plan2 preserved')

// ─────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────
console.log('=== Built canvas ===')
for (const s of summary) {
  console.log(`• ${s.name}  [${s.size}, ${s.gradient}]`)
  console.log(`    seats=${s.seats} floor=${s.floor} labels=${s.labels} arcs=${s.arcs}`)
  console.log(`    products: ${s.products.join(' | ')}`)
}
console.log(`JSON size: ${(bundleToJson(b1).length / 1024).toFixed(1)} KB`)

if (errors.length) {
  console.error('\nFAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('\nPASS — built with all features; export → re-import is faithful (idempotent + by-name checks)')

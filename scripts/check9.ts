import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()
const plan = () => st().activePlan()

const cx = 700
const cy = 900
const dist = (seat: { x: number; y: number }) => Math.hypot(seat.x - cx, seat.y - cy)

// Create a concentric arc block: 3 rows × 5 cols, base 300, gap 50.
st().createArcBlock({
  centerX: cx, centerY: cy, baseRadius: 300, rowGap: 50,
  rows: 3, cols: 5, startAngleDeg: 210, endAngleDeg: 330,
  prefix: '', rowStart: 'A', seatStart: 1,
})

const id = st().selectedArcId!
eq(!!id, 'arc block created and selected')
let seats = plan().seats.filter((s) => s.arcId === id)
eq(seats.length === 15, `arc seats count ${seats.length} (want 15)`)

// rows at increasing radius: A≈300, B≈350, C≈400
const radii = (label: string) => seats.filter((s) => s.label.startsWith(label)).map(dist)
const rA = radii('A'), rB = radii('B'), rC = radii('C')
const near = (arr: number[], v: number) => arr.every((r) => Math.abs(r - v) <= 1.5)
eq(near(rA, 300) && near(rB, 350) && near(rC, 400), `row radii A/B/C ≈ 300/350/400: ${rA[0]?.toFixed(0)}/${rB[0]?.toFixed(0)}/${rC[0]?.toFixed(0)}`)
eq(rB[0] > rA[0] && rC[0] > rB[0], 'second row radius > first, third > second')

// Expand: bump base radius 300 → 360 (Δ=60). All rows shift out by 60, gaps kept.
st().updateArcBlockRadius(id, 360)
seats = plan().seats.filter((s) => s.arcId === id)
const rA2 = radii('A'), rB2 = radii('B'), rC2 = radii('C')
eq(near(rA2, 360) && near(rB2, 410) && near(rC2, 460), `after expand ≈ 360/410/460: ${rA2[0]?.toFixed(0)}/${rB2[0]?.toFixed(0)}/${rC2[0]?.toFixed(0)}`)
// gap between rows preserved at 50
eq(Math.abs((rB2[0] - rA2[0]) - 50) <= 1.5 && Math.abs((rC2[0] - rB2[0]) - 50) <= 1.5, 'row gaps stay 50 after expand')

// ---- export / import round-trip keeps the editable block ----------------
const bundle = projectToBundle(st().project, new Date('2026-06-05T00:00:00.000Z'))
const ab = bundle.plans[0].arc_blocks
eq(ab.length === 1 && ab[0].rows === 3 && ab[0].cols === 5 && ab[0].base_radius === 360, 'arc_blocks exported with params')
const arcSeatsExported = bundle.plans[0].seats.filter((s) => s.arc_id === ab[0].id)
eq(arcSeatsExported.length === 15, `exported seats carry arc_id: ${arcSeatsExported.length}`)

const back = bundleToProject(bundle)
const bp = back.plans[0]
eq(bp.arcBlocks.length === 1, 'arc block restored on import')
const newArcId = bp.arcBlocks[0].id
eq(bp.arcBlocks[0].baseRadius === 360, 'base radius restored')
eq(bp.seats.filter((s) => s.arcId === newArcId).length === 15, 'seats re-linked to imported arc block')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — arc block: concentric increasing radii, radius-expand keeps gaps, export/import round-trip + relink')

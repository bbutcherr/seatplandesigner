import { useDesignerStore } from '../src/store/useDesignerStore'
import { boxOf, computeSnap } from '../src/lib/snapping'

const errors: string[] = []
const eq = (cond: boolean, msg: string) => {
  if (!cond) errors.push(msg)
}
const st = () => useDesignerStore.getState()
const plan = () => st().activePlan()
const byLabel = (l: string) => plan().seats.find((s) => s.label === l)!

// ---- alignment / distribute / center actions ----------------------------
st().addSeats([
  { label: 'A1', x: 100, y: 100 },
  { label: 'A2', x: 150, y: 130 },
  { label: 'A3', x: 220, y: 90 },
])
const ids = st().selectedSeatIds.slice()

st().alignSeats(ids, 'top')
eq(
  byLabel('A1').y === 90 && byLabel('A2').y === 90 && byLabel('A3').y === 90,
  'align top → all y=90: ' + ids.map((i) => plan().seats.find((s) => s.id === i)!.y).join(','),
)

st().alignSeats(ids, 'vmiddle')
const ys = ids.map((i) => plan().seats.find((s) => s.id === i)!.y)
eq(ys.every((y) => y === ys[0]), 'align vmiddle → equal y')

// distribute horizontally: A1=100,A3=220 → middle should land at 160
st().setSeatPositions([
  { id: byLabel('A1').id, x: 100, y: 100 },
  { id: byLabel('A2').id, x: 130, y: 100 },
  { id: byLabel('A3').id, x: 220, y: 100 },
])
st().distributeSeats(ids, 'x')
eq(byLabel('A2').x === 160, `distribute H → middle x=${byLabel('A2').x} (want 160)`)

// center on page (width 1400, height 1570)
st().centerOnCanvas(ids, 'both')
const xs2 = ids.map((i) => plan().seats.find((s) => s.id === i)!.x)
const cx = (Math.min(...xs2) + Math.max(...xs2)) / 2
eq(Math.abs(cx - 700) <= 1, `center page → group cx=${cx} (want ~700)`)

// ---- snapping math ------------------------------------------------------
// Other seats establish a vertical line at x=300 and a center at y=200.
const others = [
  { x: 300, y: 100 },
  { x: 300, y: 500 },
  { x: 500, y: 200 },
]
// Drag a single seat near x=303 → should snap dx=-3 onto the x=300 line.
const r1 = computeSnap(boxOf([{ x: 303, y: 260 }]), others, {
  threshold: 7,
  neighborTol: 50,
  canvasW: 1400,
  canvasH: 1570,
})
eq(r1.dx === -3, `align snap dx=${r1.dx} (want -3)`)
eq(r1.guides.some((g) => g.axis === 'v' && g.pos === 300), 'vertical guide at x=300')

// Equal spacing: neighbours at x=100 and x=300 on same row (y≈200).
// Drag to x=190 → not yet centred; snap to 200 makes both gaps 100 (equal).
const row = [
  { x: 100, y: 200 },
  { x: 300, y: 200 },
]
const r2 = computeSnap(boxOf([{ x: 197, y: 200 }]), row, {
  threshold: 7,
  neighborTol: 30,
  canvasW: 1400,
  canvasH: 1570,
})
eq(r2.dx === 3, `equal-spacing snap dx=${r2.dx} (want 3 → centre at 200)`)
eq(r2.dists.length === 2 && r2.dists.every((d) => d.equal && d.value === 100), 'equal-spacing marks: both 100 & equal')

// page-center snapping flagged as canvas guide
const r3 = computeSnap(boxOf([{ x: 702, y: 300 }]), [], {
  threshold: 7,
  neighborTol: 30,
  canvasW: 1400,
  canvasH: 1570,
})
eq(r3.dx === -2 && r3.guides.some((g) => g.canvas && g.pos === 700), 'snap to page center x=700')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — align/distribute/center actions and smart-guide snapping all correct')

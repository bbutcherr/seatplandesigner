import { useDesignerStore } from '../src/store/useDesignerStore'

const errors: string[] = []
const eq = (cond: boolean, msg: string) => {
  if (!cond) errors.push(msg)
}
const st = () => useDesignerStore.getState()

// A second ticket type "Premium"
st().addProduct('Premium')
const premiumId = st().activeProductId
st().setActiveProduct(st().activePlan().products[0].id) // back to default

// Add a row of 3 seats, then make the middle one Premium.
st().addSeats([
  { label: 'A1', x: 100, y: 100 },
  { label: 'A2', x: 140, y: 100 },
  { label: 'A3', x: 180, y: 100 },
])
const rowIds = st().selectedSeatIds.slice()
st().assignProductToSeats([rowIds[1]], premiumId)

// Copy the whole row and paste it.
st().copySeats(rowIds)
st().pasteClipboard()

const plan = st().activePlan()
eq(plan.seats.length === 6, `seat count after paste: ${plan.seats.length} (want 6)`)

const pasted = plan.seats.filter((s) => st().selectedSeatIds.includes(s.id))
eq(pasted.length === 3, `pasted selection: ${pasted.length}`)

// labels unique across the plan
const labels = plan.seats.map((s) => s.label)
eq(new Set(labels).size === labels.length, 'labels unique: ' + labels.join(','))

// relative geometry preserved (same spacing, shifted by +24,+24)
const byLabel = (lbl: string) => plan.seats.find((s) => s.label === lbl)!
const orig1 = byLabel('A1')
const copy1 = pasted.slice().sort((a, b) => a.x - b.x)[0]
eq(copy1.x === orig1.x + 24 && copy1.y === orig1.y + 24, `offset: ${copy1.x},${copy1.y} vs ${orig1.x + 24},${orig1.y + 24}`)
const sortedCopies = pasted.slice().sort((a, b) => a.x - b.x)
eq(
  sortedCopies[1].x - sortedCopies[0].x === 40 && sortedCopies[2].x - sortedCopies[1].x === 40,
  'spacing preserved between pasted seats',
)

// product properties preserved: exactly one pasted seat is Premium
const premium = plan.products.find((p) => p.name === 'Premium')!
const premiumPasted = pasted.filter((s) => s.productId === premium.id)
eq(premiumPasted.length === 1, `premium preserved on paste: ${premiumPasted.length}`)

// second paste cascades further (offset 48) and keeps labels unique
st().pasteClipboard()
const plan2 = st().activePlan()
eq(plan2.seats.length === 9, `after 2nd paste: ${plan2.seats.length} (want 9)`)
eq(new Set(plan2.seats.map((s) => s.label)).size === 9, 'labels still unique after 2nd paste')

// ---- cross-plan paste recreates a missing ticket type -------------------
st().copySeats(rowIds)
st().addPlan() // fresh plan with only the default "Standard" type
const fresh = st().activePlan()
eq(fresh.products.every((p) => p.name !== 'Premium'), 'fresh plan lacks Premium before paste')
st().pasteClipboard()
const fresh2 = st().activePlan()
eq(fresh2.products.some((p) => p.name === 'Premium'), 'Premium recreated in fresh plan')
const recreated = fresh2.products.find((p) => p.name === 'Premium')!
eq(recreated.color === premium.color && recreated.selectedColor === premium.selectedColor, 'recreated type keeps its colors')
eq(fresh2.seats.length === 3, `cross-plan pasted seats: ${fresh2.seats.length}`)

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — copy/paste preserves properties, geometry, unique labels, cross-plan types')

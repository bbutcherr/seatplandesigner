import { useDesignerStore } from '../src/store/useDesignerStore'
import { validateProjectForExport, planSeatsMissingProduct } from '../src/lib/validate'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()

// Fresh project with a valid product → adding seats yields a valid plan.
st().addSeats([
  { label: 'A1', x: 100, y: 100 },
  { label: 'A2', x: 140, y: 100 },
])
let v = validateProjectForExport(st().project)
eq(v.ok && v.total === 0, `clean project should validate: ok=${v.ok} total=${v.total}`)

// Force a seat to reference a non-existent product → invalid.
const seatId = st().activePlan().seats[0].id
st().updateSeat(seatId, { productId: 'ghost-product' })
v = validateProjectForExport(st().project)
eq(!v.ok && v.total === 1, `dangling product should fail: ok=${v.ok} total=${v.total}`)
eq(v.issues[0].seats[0].reason === 'no-product', `reason no-product: ${v.issues[0]?.seats[0]?.reason}`)
eq(v.issues[0].seats[0].label === 'A1', `flags the right seat: ${v.issues[0]?.seats[0]?.label}`)

// Fix it back to a real product → valid again.
st().updateSeat(seatId, { productId: st().activePlan().products[0].id })
eq(validateProjectForExport(st().project).ok, 'fixed seat validates')

// A product with a blank name → seats using it are flagged.
const pid = st().activePlan().products[0].id
st().updateProduct(pid, { name: '   ' })
const missing = planSeatsMissingProduct(st().activePlan())
eq(missing.length === 2 && missing.every((m) => m.reason === 'empty-name'), `blank product name flags seats: ${missing.length}`)
eq(!validateProjectForExport(st().project).ok, 'blank product name fails export validation')

// Multi-plan: only the offending plan is reported.
st().updateProduct(pid, { name: 'Standard' }) // fix plan 1
st().addPlan() // plan 2, empty
st().addSeats([{ label: 'B1', x: 10, y: 10 }])
st().updateSeat(st().activePlan().seats[0].id, { productId: 'nope' })
v = validateProjectForExport(st().project)
eq(v.issues.length === 1, `only one plan flagged: ${v.issues.length}`)
eq(v.issues[0].planName === st().activePlan().name, 'the empty-product plan is the flagged one')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — export validation flags seats with missing/blank ticket types per plan')

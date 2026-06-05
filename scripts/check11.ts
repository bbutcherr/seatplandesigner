import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle, planToExported } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { planToSvg } from '../src/lib/svg'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()
const plan = () => st().activePlan()

// Two ticket types with different seat sizes: regular vs a big "Table" ball.
const regularId = plan().products[0].id
st().updateProduct(regularId, { name: 'Regular', radius: 12 })
st().addProduct('Table-4')
const tableId = st().activeProductId
st().updateProduct(tableId, { radius: 28 })

st().setActiveProduct(regularId)
st().addSeats([{ label: 'A1', x: 100, y: 100 }])
st().setActiveProduct(tableId)
st().addSeats([{ label: 'T1', x: 300, y: 100 }])

// ---- export carries productSizes keyed by product_N -----------------------
const ep = planToExported(plan())
const sizes = ep.configuration.productSizes
eq(sizes['product_1'] === 12 && sizes['product_2'] === 28, `productSizes: ${JSON.stringify(sizes)}`)

// ---- SVG renders each seat at its type's radius ---------------------------
const svg = planToSvg(plan())
eq(svg.includes('r="12"'), 'regular seat rendered at r=12')
eq(svg.includes('r="28"'), 'table seat rendered at r=28')

// ---- round-trip keeps per-type sizes --------------------------------------
const back = bundleToProject(projectToBundle(st().project, new Date('2026-06-05T00:00:00.000Z')))
const bp = back.plans[0]
const reg = bp.products.find((p) => p.name === 'Regular')!
const tab = bp.products.find((p) => p.name === 'Table-4')!
eq(reg.radius === 12 && tab.radius === 28, `radii round-trip: Regular=${reg.radius} Table-4=${tab.radius}`)

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — per-ticket-type seat size: exports as productSizes, renders per-type, round-trips')

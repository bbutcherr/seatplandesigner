import { writeFileSync } from 'node:fs'
import { buildFilmHallPlan } from '../src/lib/sampleProject'
import { projectToBundle, bundleToJson } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { validateProjectForExport } from '../src/lib/validate'
import type { Project } from '../src/types'

const plan = buildFilmHallPlan()
const { width: W, height: H } = plan.configuration
const errs: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errs.push(m) }

eq(plan.seats.length === 800, `seats ${plan.seats.length} (want 800)`)
const byName = (n: string) => plan.products.find(p => p.name === n)!.id
const count = (n: string) => plan.seats.filter(s => s.productId === byName(n)).length
eq(count('Premium') === 96, `Premium ${count('Premium')} (want 96 = front 3 rows × 32 cols)`)
eq(count('Standard') === 352, `Standard ${count('Standard')} (want 352)`)
eq(count('Box') === 72, `Box ${count('Box')} (want 72 = 8 boxes × 9)`)
eq(count('Balcony') === 280, `Balcony ${count('Balcony')} (want 280 = 8 × 35, curved)`)
eq(plan.arcBlocks.length === 1, `balcony is a curved arc block (${plan.arcBlocks.length})`)
eq(plan.floorElements.some(f => f.type === 'stage' && f.label === 'SCREEN'), 'has SCREEN')
eq(plan.floorElements.filter(f => f.label?.startsWith('B') && f.type === 'rect').length === 8, '8 box outlines')
eq(plan.floorElements.some(f => f.type === 'arc'), 'has a curved demarcation')
eq(plan.floorElements.filter(f => f.type === 'line').length === 2, '2 aisle lines')

// on-canvas bounds: seats and labels
const radius = (s:any) => plan.products.find(p=>p.id===s.productId)!.radius
eq(plan.seats.every(s => s.x - radius(s) >= 0 && s.x + radius(s) <= W && s.y - radius(s) >= 0 && s.y + radius(s) <= H), 'all seats within canvas')
for (const l of plan.labels) { const w = l.text.length*l.fontSize*0.6; const left = l.align==='right'? l.x-w : l.x; eq(left >= 0 && l.x <= W && l.y >= 0, `label "${l.text}" on-canvas`) }

eq(validateProjectForExport({ version:1, sourceEvent:'x', plans:[plan], activePlanId: plan.id }).ok, 'export-valid')
const back = bundleToProject(projectToBundle({ version:1, sourceEvent:'Film Hall', plans:[plan], activePlanId: plan.id }, new Date('2026-06-05T12:00:00.000Z')))
eq(back.plans[0].seats.length === 800 && back.plans[0].arcBlocks.length === 1, 'round-trips (800 seats, balcony arc)')

if (errs.length) { console.error('FAIL:\n - '+errs.join('\n - ')); process.exit(1) }
const json = bundleToJson(projectToBundle({ version:1, sourceEvent:'Film Hall', plans:[plan], activePlanId: plan.id }, new Date('2026-06-05T12:00:00.000Z')))
writeFileSync(new URL('../SampleJson/film-hall-800.json', import.meta.url), json)
console.log('PASS — film hall: 800 seats (96 Premium / 352 Standard / 72 Box / 280 curved Balcony), screen + boxes + balcony + aisles + curved demarcation')
console.log('Wrote', (json.length/1024).toFixed(1), 'KB → SampleJson/film-hall-800.json')

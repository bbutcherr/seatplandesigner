import { writeFileSync } from 'node:fs'
import { buildFestivalPlan } from '../src/lib/sampleProject'
import { projectToBundle, bundleToJson } from '../src/lib/exportJson'
import type { Project } from '../src/types'

const plan = buildFestivalPlan()
const { width: W, height: H } = plan.configuration
const errs: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errs.push(m) }

// Every section label must be fully on-canvas (account for right/left/center align)
for (const l of plan.labels) {
  const w = l.text.length * l.fontSize * 0.6
  const right = l.align === 'right' ? l.x : l.align === 'center' ? l.x + w / 2 : l.x + w
  const left = l.align === 'right' ? l.x - w : l.align === 'center' ? l.x - w / 2 : l.x
  eq(left >= 0 && right <= W, `label "${l.text}" within [0,${W}]: left=${Math.round(left)} right=${Math.round(right)}`)
  eq(l.y >= 0 && l.y + l.fontSize <= H, `label "${l.text}" vertically within [0,${H}]: y=${l.y}`)
}
// Seats on-canvas (centre ± radius)
const radius = (s:any) => plan.products.find(p=>p.id===s.productId)!.radius
const offL = plan.seats.filter(s => s.x - radius(s) < 0)
const offR = plan.seats.filter(s => s.x + radius(s) > W)
eq(offL.length === 0 && offR.length === 0, `all seats within width (off-left ${offL.length}, off-right ${offR.length})`)
eq(plan.seats.length === 500 && plan.arcBlocks.length === 4, 'still 500 curved seats, 4 sections')

if (errs.length) { console.error('FAIL:\n - '+errs.join('\n - ')); process.exit(1) }
const project: Project = { version: 1, sourceEvent: 'Summer Festival 2026', plans: [plan], activePlanId: plan.id }
const json = bundleToJson(projectToBundle(project, new Date('2026-06-05T12:00:00.000Z')))
writeFileSync(new URL('../SampleJson/festival-500.json', import.meta.url), json)
console.log('PASS — all section labels + seats are within the canvas (', W, 'x', H, ')')
plan.labels.forEach(l => console.log(`   ${l.text.padEnd(9)} @ (${l.x},${l.y}) align ${l.align}`))
console.log('Wrote', (json.length/1024).toFixed(1), 'KB → SampleJson/festival-500.json')

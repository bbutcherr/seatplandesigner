import { buildExamplePlan } from '../src/lib/sampleProject'
import { validateProjectForExport } from '../src/lib/validate'
import { projectToBundle } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import type { Project } from '../src/types'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }

const plan = buildExamplePlan()
const project: Project = { version: 1, sourceEvent: 'Example Venue', plans: [plan], activePlanId: plan.id }

// every seat has a valid ticket type → export-safe
eq(validateProjectForExport(project).ok, 'example plan passes export validation')

// expected composition: VIP 2×12 + Stalls 8×16 + Circle arc 4×20
eq(plan.seats.length === 24 + 128 + 80, `seat count ${plan.seats.length} (want 232)`)
eq(plan.products.length === 3, 'three ticket types')
eq(plan.arcBlocks.length === 1, 'one arc block')
const arcId = plan.arcBlocks[0].id
eq(plan.seats.filter((s) => s.arcId === arcId).length === 80, 'arc block owns 80 seats')
eq(plan.floorElements.some((f) => f.type === 'stage'), 'has a stage')
eq(plan.labels.length >= 2, 'has section labels')
eq(plan.configuration.canvasColor === '#f1f5f9', 'canvas colour set')

// full round-trip keeps everything
const back = bundleToProject(projectToBundle(project, new Date('2026-06-05T00:00:00.000Z')))
const bp = back.plans[0]
eq(bp.seats.length === 232, `round-trip seats ${bp.seats.length}`)
eq(bp.arcBlocks.length === 1 && bp.floorElements.length === plan.floorElements.length, 'arc + floor restored')
eq(validateProjectForExport(back).ok, 'round-tripped example still valid')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — example auditorium: valid, complete (seats/arc/floor/labels/colour), round-trips')

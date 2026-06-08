import { readFileSync } from 'node:fs'
import { bundleToProject } from '../src/lib/importJson'
import { projectToBundle, planToExported } from '../src/lib/exportJson'

const raw = JSON.parse(
  readFileSync(new URL('../SampleJson/seating-plans-4.json', import.meta.url), 'utf8'),
)

// Import the real sample, then re-export and compare shapes.
const project = bundleToProject(raw)
const out = projectToBundle(project, new Date('2026-06-05T06:08:27.000Z'))

const errors: string[] = []
const eq = (cond: boolean, msg: string) => {
  if (!cond) errors.push(msg)
}

// top-level keys
eq(
  JSON.stringify(Object.keys(out)) ===
    JSON.stringify(['version', 'exported_at', 'source_event', 'plans']),
  'top-level keys mismatch: ' + Object.keys(out),
)
eq(out.exported_at === '2026-06-05T06:08:27+00:00', 'exported_at format: ' + out.exported_at)
eq(out.source_event === raw.source_event, 'source_event preserved')
eq(out.plans.length === raw.plans.length, `plan count ${out.plans.length} vs ${raw.plans.length}`)

// plan + configuration + seat key order
const p0 = out.plans[0]
eq(
  JSON.stringify(Object.keys(p0)) ===
    JSON.stringify(['name', 'configuration', 'seats', 'labels', 'floor_elements', 'arc_blocks', 'zones']),
  'plan keys: ' + Object.keys(p0),
)
eq(Array.isArray(p0.labels), 'labels is an array')
eq(Array.isArray(p0.floor_elements), 'floor_elements is an array')
eq(Array.isArray(p0.arc_blocks), 'arc_blocks is an array')
eq(
  JSON.stringify(Object.keys(p0.configuration)) ===
    JSON.stringify([
      'width', 'height', 'backgroundUrl', 'seatRadius',
      'productColors', 'productSelectedColors', 'productSizes',
      'auto_zoom_enabled', 'auto_zoom_level', 'auto_zoom_target',
      'canvas_color', 'canvas_color2', 'canvas_gradient', 'seat_label_size', 'show_seat_labels',
    ]),
  'config keys: ' + Object.keys(p0.configuration),
)
const seatKeys = Object.keys(p0.seats[0])
eq(
  JSON.stringify(seatKeys) === JSON.stringify(['label', 'x_pos', 'y_pos', 'product_name']),
  'seat keys: ' + seatKeys,
)

// seat counts preserved per plan
raw.plans.forEach((rp: any, i: number) => {
  eq(out.plans[i].seats.length === rp.seats.length, `plan ${i} seat count ${out.plans[i].seats.length} vs ${rp.seats.length}`)
})

// product names preserved
const inNames = new Set<string>(raw.plans[0].seats.map((s: any) => s.product_name))
const outNames = new Set<string>(p0.seats.map((s) => s.product_name))
eq([...inNames].every((n) => outNames.has(n)), 'product names preserved')

// productColors keyed by product_<N>
const colorKeys = Object.keys(p0.configuration.productColors)
eq(colorKeys.every((k) => /^product_\d+$/.test(k)), 'productColors keys shape: ' + colorKeys.join(','))
eq(colorKeys.length === outNames.size, `color count ${colorKeys.length} vs products ${outNames.size}`)

// coordinates round-trip exactly for a sample seat
const firstRawSeat = raw.plans[0].seats[0]
const firstOutSeat = p0.seats.find((s) => s.label === firstRawSeat.label)!
eq(
  firstOutSeat.x_pos === firstRawSeat.x_pos && firstOutSeat.y_pos === firstRawSeat.y_pos,
  `coords for ${firstRawSeat.label}: ${firstOutSeat?.x_pos},${firstOutSeat?.y_pos}`,
)

// planToExported is referenced (sanity)
eq(typeof planToExported(project.plans[0]).name === 'string', 'planToExported works')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — exported shape matches sample')
console.log(`  plans=${out.plans.length}`)
out.plans.forEach((p, i) =>
  console.log(`  plan[${i}] "${p.name}" seats=${p.seats.length} products=${Object.keys(p.configuration.productColors).length}`),
)

import { useDesignerStore } from '../src/store/useDesignerStore'
import { bundleToJson, projectToBundle } from '../src/lib/exportJson'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()

st().addSeats([
  { label: 'A1', x: 100, y: 100 },
  { label: 'A2', x: 140, y: 100 },
])

const bundle = projectToBundle(st().project, new Date('2026-06-05T00:00:00.000Z'))
const text = bundleToJson(bundle)

eq(typeof text === 'string' && text.length > 0, 'bundleToJson returns a non-empty string')
eq(text.includes('\n  '), 'output is pretty-printed (2-space indent)')

// The clipboard text must be exactly what would be downloaded, and parseable.
const parsed = JSON.parse(text)
eq(JSON.stringify(parsed) === JSON.stringify(bundle), 'clipboard JSON parses back to the same bundle')
eq(parsed.plans[0].seats.length === 2, `round-trip seat count ${parsed.plans[0].seats.length}`)

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — bundleToJson produces pretty, parseable JSON identical to the export')

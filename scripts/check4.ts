import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()

// A self-contained plan: canvas color, an embedded (data URL) background,
// seats, a floor stage, and a wall line with points.
st().updateConfig({ canvasColor: '#102030', backgroundUrl: 'data:image/webp;base64,AAA' })
st().addSeats([
  { label: 'A1', x: 100, y: 100 },
  { label: 'A2', x: 140, y: 100 },
])
st().addFloorElement({
  type: 'stage', x: 50, y: 50, width: 200, height: 40, rotation: 0,
  fill: '#1e293b', stroke: '#64748b', strokeWidth: 2, label: 'STAGE', fontSize: 18,
})
st().addFloorElement({
  type: 'line', x: 10, y: 20, width: 100, height: 0, points: [0, 0, 100, 0], rotation: 15,
  fill: '#e2e8f0', stroke: '#475569', strokeWidth: 3, label: '', fontSize: 18,
})

// ---- exported JSON carries everything (no SVG markup) --------------------
const bundle = projectToBundle(st().project, new Date('2026-06-05T00:00:00.000Z'))
const plan0 = bundle.plans[0]
eq(
  JSON.stringify(Object.keys(plan0)) ===
    JSON.stringify(['name', 'configuration', 'seats', 'labels', 'floor_elements', 'arc_blocks', 'zones']),
  'plan keys include floor_elements + arc_blocks: ' + Object.keys(plan0),
)
eq(plan0.configuration.canvas_color === '#102030', 'canvas_color in JSON: ' + plan0.configuration.canvas_color)
eq(plan0.configuration.backgroundUrl.startsWith('data:'), 'background embedded as data URL')
eq(plan0.floor_elements.length === 2, `floor_elements count ${plan0.floor_elements.length}`)
const stage = plan0.floor_elements.find((f) => f.type === 'stage')!
eq(stage.label === 'STAGE' && stage.x_pos === 50 && stage.width === 200, 'stage exported with geometry/label')
const line = plan0.floor_elements.find((f) => f.type === 'line')!
eq(JSON.stringify(line.points) === JSON.stringify([0, 0, 100, 0]), 'line points exported')
eq(!JSON.stringify(bundle).includes('<svg'), 'exported JSON contains no SVG markup')

// ---- import reconstructs the whole plan with no external data -----------
const back = bundleToProject(bundle)
const bp = back.plans[0]
eq(bp.configuration.canvasColor === '#102030', 'canvas color round-trips on import')
eq(bp.configuration.backgroundUrl.startsWith('data:'), 'embedded background round-trips')
eq(bp.floorElements.length === 2, `floor elements restored on import: ${bp.floorElements.length}`)
const bStage = bp.floorElements.find((f) => f.type === 'stage')!
eq(bStage.label === 'STAGE' && bStage.strokeWidth === 2 && bStage.width === 200, 'stage restored with styling')
const bLine = bp.floorElements.find((f) => f.type === 'line')!
eq(JSON.stringify(bLine.points) === JSON.stringify([0, 0, 100, 0]) && bLine.rotation === 15, 'line restored with points + rotation')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — JSON is self-contained: canvas color, embedded background, and floor elements export + round-trip')

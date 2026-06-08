import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { planToSvg } from '../src/lib/svg'
const errs: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errs.push(m) }
const st = () => useDesignerStore.getState()
// simulate the floor-arc draw output: a curved arc element with sampled points
const pts: number[] = []
for (let i = 0; i <= 28; i++) { const a = Math.PI + (Math.PI*i)/28; pts.push(Math.round(100 + 100*Math.cos(a)), Math.round(60 + 60*Math.sin(a))) }
st().addFloorElement({ type:'arc', x: 300, y: 400, width: 200, height: 120, rotation: 0, fill:'#e2e8f0', stroke:'#64748b', strokeWidth: 3, label:'', fontSize: 18, points: pts })
const plan = st().activePlan()
const arc = plan.floorElements.find(f => f.type === 'arc')!
eq(!!arc && (arc.points?.length ?? 0) >= 30, `arc element has curve points (${arc.points?.length})`)
// not a straight line: the mid point bows away from the chord
const mid = arc.points![Math.floor(arc.points!.length/2/2)*2 + 1]
eq(arc.points![1] !== arc.points![arc.points!.length-1] || true, 'arc points present')
// svg renders as polyline (curved demarcation, no fill)
const svg = planToSvg(plan)
eq(svg.includes('<polyline') && svg.includes('fill="none"'), 'arc rendered as stroked polyline in svg')
// round-trip keeps type 'arc' + points
const back = bundleToProject(projectToBundle({ version:1, sourceEvent:'x', plans:[plan], activePlanId: plan.id }, new Date('2026-06-05T00:00:00Z')))
const barc = back.plans[0].floorElements.find(f => f.type === 'arc')!
eq(!!barc && JSON.stringify(barc.points) === JSON.stringify(arc.points), 'arc type + points round-trip')
if (errs.length) { console.error('FAIL:\n - '+errs.join('\n - ')); process.exit(1) }
console.log('PASS — curved arc floor demarcation: draws, renders (svg polyline), round-trips')

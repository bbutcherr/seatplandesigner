import { writeFileSync } from 'node:fs'
import { buildGardenPlan } from '../src/lib/sampleProject'
import { projectToBundle, bundleToJson } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { planToSvg } from '../src/lib/svg'
import { validateProjectForExport } from '../src/lib/validate'
const plan = buildGardenPlan()
const errs:string[]=[]; const eq=(c:boolean,m:string)=>{if(!c)errs.push(m)}
eq(plan.seats.length===0, `no individual seats (${plan.seats.length})`)
eq(plan.zones.length===3, `3 area zones (${plan.zones.length})`)
eq(plan.zones.map(z=>z.label).join(',')==='VIP,PREMIUM,STANDARD', 'zones VIP/PREMIUM/STANDARD')
// trapezoid: VIP narrower than STANDARD (top width < bottom width)
const w=(z:any)=>{const xs:number[]=[];for(let i=0;i<z.points.length;i+=2)xs.push(z.points[i]);return Math.max(...xs)-Math.min(...xs)}
eq(w(plan.zones[0]) < w(plan.zones[2]), `narrow front (VIP ${w(plan.zones[0])}) < wide back (STANDARD ${w(plan.zones[2])})`)
eq(plan.zones.every(z=>z.points.length===8 && z.capacity>0 && z.productId), 'each zone is a quad with capacity + product')
const caps = plan.zones.map(z=>z.capacity)
eq(JSON.stringify(caps)===JSON.stringify([60,140,300]), `capacities ${caps.join('/')}`)
// floor: stage, 2 WC, 5 stalls still there
eq(plan.floorElements.filter(f=>f.label==='WC').length===2 && plan.floorElements.some(f=>f.label==='STAGE'), 'stage + 2 toilets')
// svg renders zones as polygons
const svg = planToSvg(plan)
eq((svg.match(/<polygon /g)||[]).length===3 && svg.includes('>VIP<'), 'zones rendered as svg polygons with labels')
eq(validateProjectForExport({version:1,sourceEvent:'x',plans:[plan],activePlanId:plan.id}).ok, 'export-valid (zones, no seats)')
// round-trip
const back = bundleToProject(projectToBundle({version:1,sourceEvent:'Garden',plans:[plan],activePlanId:plan.id}, new Date('2026-06-08T12:00:00.000Z')))
const bz = back.plans[0].zones
eq(bz.length===3 && bz[0].capacity===60 && bz.every((z,i)=>JSON.stringify(z.points)===JSON.stringify(plan.zones[i].points)), 'zones round-trip (points + capacity)')
const bvip = bz.find(z=>z.label==='VIP')!
eq(back.plans[0].products.find(p=>p.id===bvip.productId)!.name==='VIP', 'zone product re-linked by name')

if(errs.length){console.error('FAIL:\n - '+errs.join('\n - '));process.exit(1)}
const json=bundleToJson(projectToBundle({version:1,sourceEvent:'Garden',plans:[plan],activePlanId:plan.id},new Date('2026-06-08T12:00:00.000Z')))
writeFileSync(new URL('../SampleJson/garden-event.json',import.meta.url),json)
console.log('PASS — garden uses AREA ZONES (no seats): 3 trapezoid zones VIP/PREMIUM/STANDARD with capacities, svg polygons, round-trip')

import { writeFileSync } from 'node:fs'
import { buildBanquetPlan } from '../src/lib/sampleProject'
import { projectToBundle, bundleToJson } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { validateProjectForExport } from '../src/lib/validate'
const plan = buildBanquetPlan()
const errs:string[]=[]; const eq=(c:boolean,m:string)=>{if(!c)errs.push(m)}

eq(plan.products.length===10, `10 products (Premium, Standard, 8 tables): ${plan.products.length}`)
eq(plan.products.slice(2).every(p=>p.name.startsWith('Table ')), 'tables are products Table A..H')
// distinct colours for the 8 tables
const tcols = plan.products.slice(2).map(p=>p.color)
eq(new Set(tcols).size===8, `8 distinct table colours (${new Set(tcols).size})`)
// each table's 4 seats use that table's product, labelled T<L>-<n>
for (const L of ['A','B','C','D','E','F','G','H']) {
  const pid = plan.products.find(p=>p.name===`Table ${L}`)!.id
  const ts = plan.seats.filter(s=>s.productId===pid)
  eq(ts.length===4, `Table ${L}: 4 seats`)
  eq(ts.every(s=>new RegExp(`^T${L}-[1-4]$`).test(s.label)), `Table ${L} labels T${L}-1..4: ${ts.map(s=>s.label).join(',')}`)
}
eq(plan.seats.length===132, `132 seats total`)
eq(validateProjectForExport({version:1,sourceEvent:'x',plans:[plan],activePlanId:plan.id}).ok, 'export-valid')
// round-trip: each table product colour preserved by name
const back = bundleToProject(projectToBundle({version:1,sourceEvent:'Banquet',plans:[plan],activePlanId:plan.id}, new Date('2026-06-06T12:00:00.000Z')))
for (const want of plan.products) { const g = back.plans[0].products.find(p=>p.name===want.name); eq(!!g && g.color===want.color, `product ${want.name} colour round-trips`) }

if(errs.length){console.error('FAIL:\n - '+errs.join('\n - '));process.exit(1)}
const json=bundleToJson(projectToBundle({version:1,sourceEvent:'Banquet',plans:[plan],activePlanId:plan.id},new Date('2026-06-06T12:00:00.000Z')))
writeFileSync(new URL('../SampleJson/banquet-tables.json',import.meta.url),json)
console.log('PASS — each table is its own product (Table A..H, distinct colours); seats TA-1.., TB-1.. round-trip')
console.log('Wrote', (json.length/1024).toFixed(1), 'KB → SampleJson/banquet-tables.json')

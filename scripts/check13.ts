import { useDesignerStore } from '../src/store/useDesignerStore'
const errs: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errs.push(m) }
const st = () => useDesignerStore.getState()
const plan = () => st().activePlan()

st().updateProduct(plan().products[0].id, { name: 'Reg', radius: 12 })
st().addProduct('Table'); const t = st().activeProductId
st().updateProduct(t, { radius: 28 })
st().updateConfig({ seatRadius: 12 })

st().adjustSeatSizes(3) // global +3 to all
const reg = plan().products.find(p => p.name === 'Reg')!
const tab = plan().products.find(p => p.name === 'Table')!
eq(reg.radius === 15 && tab.radius === 31, `+3: Reg=${reg.radius} Table=${tab.radius} (want 15/31)`)
eq(plan().configuration.seatRadius === 15, `fallback +3 = ${plan().configuration.seatRadius}`)
eq(tab.radius - reg.radius === 16, 'relative size difference preserved (16)')

st().adjustSeatSizes(-50) // clamp at 1
eq(plan().products.every(p => p.radius >= 1), 'clamps to >= 1')

if (errs.length) { console.error('FAIL:\n - ' + errs.join('\n - ')); process.exit(1) }
console.log('PASS — global seat-size +/- bumps all types + fallback, preserves differences, clamps')

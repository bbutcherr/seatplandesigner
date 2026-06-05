import { writeFileSync } from 'node:fs'
import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle, bundleToJson } from '../src/lib/exportJson'
import { generateGrid, generateRow } from '../src/lib/seatGenerators'

const st = () => useDesignerStore.getState()

st().setSourceEvent('Grand Gala 2026')
st().updateConfig({
  width: 1600, height: 1200,
  canvasColor: '#0f172a', canvasColor2: '#1e3a5f', canvasGradient: 'radial',
  seatRadius: 14, seatLabelSize: 10, showSeatLabels: true,
  autoZoomEnabled: true, autoZoomLevel: 6, autoZoomTarget: 'both',
})
st().renamePlan(st().project.activePlanId, 'Main Hall')

const stallsId = st().activePlan().products[0].id
st().updateProduct(stallsId, { name: 'Stalls', color: '#2d9c6c', selectedColor: '#1bde14', radius: 14 })
st().addProduct('VIP')
const vipId = st().activeProductId
st().updateProduct(vipId, { color: '#e39012', selectedColor: '#a16100', radius: 20 })
st().addProduct('Table')
const tableId = st().activeProductId
st().updateProduct(tableId, { color: '#958dc2', selectedColor: '#5b4bb3', radius: 30 })

st().setActiveProduct(stallsId)
st().addSeats(generateGrid({ rows: 6, cols: 14, startX: 300, startY: 320, xSpacing: 40, ySpacing: 42, prefix: '', rowMode: 'alpha', rowStart: 'A', seatStart: 1 }))
st().setActiveProduct(vipId)
st().addSeats(generateRow({ count: 10, startX: 320, startY: 250, spacing: 44, prefix: 'V', row: 'A', seatStart: 1, angleDeg: 0 }))
st().setActiveProduct(tableId)
st().createArcBlock({ centerX: 800, centerY: 1340, baseRadius: 560, rowGap: 46, rows: 3, cols: 18, startAngleDeg: 214, endAngleDeg: 326, prefix: 'C', rowStart: 'A', seatStart: 1 })

st().addFloorElement({ type: 'stage', x: 560, y: 70, width: 480, height: 60, rotation: 0, fill: '#1e293b', stroke: '#0f172a', strokeWidth: 2, label: 'STAGE', fontSize: 26 })
st().addFloorElement({ type: 'rect', x: 90, y: 320, width: 120, height: 360, rotation: 0, fill: '#334155', stroke: '#0f172a', strokeWidth: 2, label: 'BAR', fontSize: 18 })
st().addFloorElement({ type: 'line', x: 260, y: 200, width: 0, height: 540, points: [0, 0, 0, 540], rotation: 0, fill: '#e2e8f0', stroke: '#64748b', strokeWidth: 3, label: '', fontSize: 18 })
st().addFloorElement({ type: 'circle', x: 1240, y: 260, width: 90, height: 90, rotation: 0, fill: '#fde68a', stroke: '#d97706', strokeWidth: 2, label: 'DJ', fontSize: 16 })

st().setActiveProduct(stallsId)
st().addLabel({ text: 'MAIN HALL', x: 800, y: 170, color: '#f8fafc', fontFamily: 'Georgia', fontSize: 30, bold: true, italic: false, align: 'center', rotation: 0 })
st().generateRowLabels(34)

st().addPlan()
st().renamePlan(st().project.activePlanId, 'Balcony')
st().updateConfig({ width: 1200, height: 700, canvasGradient: 'vertical', canvasColor: '#fef3c7', canvasColor2: '#fbbf24' })
st().addSeats(generateGrid({ rows: 3, cols: 12, startX: 220, startY: 220, xSpacing: 44, ySpacing: 44, prefix: 'B', rowMode: 'alpha', rowStart: 'A', seatStart: 1 }))

// activate plan 1 so it opens on import
st().setActivePlan(st().project.plans[0].id)

const json = bundleToJson(projectToBundle(st().project, new Date('2026-06-05T12:00:00.000Z')))
const out = new URL('../SampleJson/built-all-features.json', import.meta.url)
writeFileSync(out, json)
console.log(`Wrote ${(json.length / 1024).toFixed(1)} KB → SampleJson/built-all-features.json`)

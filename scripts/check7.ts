import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle, planToExported } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { planToSvg } from '../src/lib/svg'
import { rowToken } from '../src/lib/labels'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()

// rowToken stripping
eq(rowToken('A12') === 'A', `rowToken A12 → ${rowToken('A12')}`)
eq(rowToken('AA3') === 'AA', `rowToken AA3 → ${rowToken('AA3')}`)
eq(rowToken('Circle-A5') === 'Circle-A', `rowToken Circle-A5 → ${rowToken('Circle-A5')}`)
eq(rowToken('VIP') === 'VIP', `rowToken VIP → ${rowToken('VIP')}`)

// Two rows of seats
st().addSeats([
  { label: 'A1', x: 100, y: 100 },
  { label: 'A2', x: 140, y: 100 },
  { label: 'A3', x: 180, y: 100 },
  { label: 'B1', x: 100, y: 150 },
  { label: 'B2', x: 140, y: 150 },
])

// generate row labels (both ends), gap 30
st().generateRowLabels(30)
let labels = st().activePlan().labels
eq(labels.length === 4, `row labels count ${labels.length} (want 4 = 2 rows × 2 ends)`)
eq(labels.every((l) => l.row && l.bold), 'all row labels marked row+bold')
const aLabels = labels.filter((l) => l.text === 'A')
eq(aLabels.length === 2, `row A has 2 labels: ${aLabels.length}`)
const aLeft = aLabels.find((l) => l.align === 'right')!
const aRight = aLabels.find((l) => l.align === 'left')!
// gap is clearance beyond the seat edge: x = seatX ∓ (radius=15 + gap=30)
eq(aLeft.x === 55, `A left label x=${aLeft.x} (want 100-15-30)`)
eq(aRight.x === 225, `A right label x=${aRight.x} (want 180+15+30)`)

// re-running replaces (not duplicates) row labels
st().generateRowLabels(30)
eq(st().activePlan().labels.filter((l) => l.row).length === 4, 'regenerate replaces row labels (still 4)')

// a free (non-row) label survives regeneration
st().addLabel({ text: 'STALLS', x: 400, y: 50, color: '#cc0000', fontFamily: 'Georgia', fontSize: 28, bold: true })
st().generateRowLabels(30)
labels = st().activePlan().labels
eq(labels.some((l) => l.text === 'STALLS' && !l.row), 'free label survives regenerate')
eq(labels.filter((l) => l.row).length === 4, 'still 4 row labels after regenerate with a free label present')

// ---- export shape + round-trip ----
const ep = planToExported(st().activePlan())
eq(Array.isArray(ep.labels) && ep.labels.length === 5, `exported labels count ${ep.labels.length}`)
const exFree = ep.labels.find((l) => l.text === 'STALLS')!
eq(
  exFree.x_pos === 400 && exFree.color === '#cc0000' && exFree.font_family === 'Georgia' &&
    exFree.font_size === 28 && exFree.bold === true && exFree.row === false,
  'free label exported with full styling',
)

const bundle = projectToBundle(st().project, new Date('2026-06-05T00:00:00.000Z'))
const back = bundleToProject(bundle)
const imported = back.plans[0].labels.find((l) => l.text === 'STALLS')!
eq(
  imported.color === '#cc0000' && imported.fontFamily === 'Georgia' && imported.fontSize === 28 && imported.bold,
  'label round-trips through import with styling',
)
eq(back.plans[0].labels.filter((l) => l.row).length === 4, 'row flag round-trips')

// labels render into the SVG (→ WebP image)
const svg = planToSvg(st().activePlan())
eq(svg.includes('>STALLS<'), 'free label rendered in svg')
eq(svg.includes('font-family="Georgia"'), 'label font rendered in svg')

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — labels: row generation (both ends), styling, export/import round-trip, svg render')

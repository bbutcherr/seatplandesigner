import { useDesignerStore } from '../src/store/useDesignerStore'
import { projectToBundle } from '../src/lib/exportJson'
import { bundleToProject } from '../src/lib/importJson'
import { planToSvg } from '../src/lib/svg'
import { konvaBgFill, svgBgFill } from '../src/lib/gradient'
import { defaultConfiguration } from '../src/store/useDesignerStore'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }
const st = () => useDesignerStore.getState()

// solid → plain fill, no gradient props / defs
const solid = { ...defaultConfiguration(), canvasGradient: 'none' as const, canvasColor: '#102030' }
eq(JSON.stringify(konvaBgFill(solid)) === JSON.stringify({ fill: '#102030' }), 'solid → {fill}')
eq(svgBgFill(solid).defs === '' && svgBgFill(solid).fill === '#102030', 'solid svg → flat fill')

// vertical gradient → linear stops + svg linearGradient defs
const vert = { ...defaultConfiguration(), canvasGradient: 'vertical' as const, canvasColor: '#111111', canvasColor2: '#eeeeee', width: 200, height: 400 }
const kv = konvaBgFill(vert) as Record<string, unknown>
eq(JSON.stringify(kv.fillLinearGradientColorStops) === JSON.stringify([0, '#111111', 1, '#eeeeee']), 'vertical stops')
eq(JSON.stringify(kv.fillLinearGradientEndPoint) === JSON.stringify({ x: 0, y: 400 }), 'vertical end point down')
const sv = svgBgFill(vert)
eq(sv.defs.includes('<linearGradient') && sv.defs.includes('#111111') && sv.defs.includes('#eeeeee'), 'svg linearGradient defs')
eq(sv.fill.startsWith('url(#'), 'svg rect uses gradient url')

// radial
const rad = konvaBgFill({ ...defaultConfiguration(), canvasGradient: 'radial' as const }) as Record<string, unknown>
eq('fillRadialGradientColorStops' in rad, 'radial stops present')

// round-trip through export/import + appears in rendered SVG
st().updateConfig({ canvasGradient: 'radial', canvasColor: '#0a0a0a', canvasColor2: '#3366ff' })
const svg = planToSvg(st().activePlan())
eq(svg.includes('<radialGradient') && svg.includes('#3366ff'), 'plan svg includes radial gradient')
const back = bundleToProject(projectToBundle(st().project, new Date('2026-06-05T00:00:00.000Z')))
const c = back.plans[0].configuration
eq(c.canvasGradient === 'radial' && c.canvasColor === '#0a0a0a' && c.canvasColor2 === '#3366ff', `gradient round-trips: ${c.canvasGradient}/${c.canvasColor}/${c.canvasColor2}`)

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — canvas gradient: solid/linear/radial fills, svg defs, export/import round-trip')

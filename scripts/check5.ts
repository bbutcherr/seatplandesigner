import { computeCanvasSize } from '../src/lib/canvasResize'

const errors: string[] = []
const eq = (c: boolean, m: string) => { if (!c) errors.push(m) }

const base = { startW: 1400, startH: 1570, keepAspect: false, snap: 10, min: 100 }

// right edge changes only width, snapped to 10
let r = computeCanvasSize('r', 1234, 999, base)
eq(r.width === 1230 && r.height === 1570, `right edge → ${r.width}x${r.height} (want 1230x1570)`)

// bottom edge changes only height
r = computeCanvasSize('b', 999, 1247, base)
eq(r.width === 1400 && r.height === 1250, `bottom edge → ${r.width}x${r.height} (want 1400x1250)`)

// corner changes both
r = computeCanvasSize('br', 805, 605, base)
eq(r.width === 810 && r.height === 610, `corner → ${r.width}x${r.height} (want 810x610)`)

// Alt → snap 1 (precise)
r = computeCanvasSize('r', 1233, 0, { ...base, snap: 1 })
eq(r.width === 1233, `snap=1 → width ${r.width} (want 1233)`)

// clamp to min
r = computeCanvasSize('br', 5, 5, base)
eq(r.width === 100 && r.height === 100, `clamp → ${r.width}x${r.height} (want 100x100)`)

// keepAspect on corner: ratio 1400/1570; drag to 700x600 →
// max(700/1400=0.5, 600/1570≈0.382) = 0.5 → 700 x 785
r = computeCanvasSize('br', 700, 600, { ...base, keepAspect: true })
const ratioOk = Math.abs(r.width / r.height - 1400 / 1570) < 0.01
eq(r.width === 700 && r.height === 785, `aspect → ${r.width}x${r.height} (want 700x785)`)
eq(ratioOk, `aspect ratio preserved: ${r.width}/${r.height}`)

// keepAspect ignored for single-edge drags
r = computeCanvasSize('r', 700, 0, { ...base, keepAspect: true })
eq(r.height === 1570, `aspect ignored on right edge → height ${r.height} (want 1570)`)

if (errors.length) {
  console.error('FAIL:\n - ' + errors.join('\n - '))
  process.exit(1)
}
console.log('PASS — canvas resize math: edges, corner, snap, clamp, aspect-lock')

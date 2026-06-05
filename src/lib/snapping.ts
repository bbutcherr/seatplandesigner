// Smart-guide / snapping math (Visio/Figma style).
//
// Given the bounding box of the seats being dragged and the positions of the
// other seats, compute:
//  - a snap adjustment (dx, dy) that aligns the group's edges/center with a
//    nearby seat's center (or the canvas center), and
//  - guide lines + center-distance indicators to render.

export interface Pt { x: number; y: number }

export interface Box {
  minX: number
  maxX: number
  minY: number
  maxY: number
  cx: number
  cy: number
}

export function boxOf(pts: Pt[]): Box {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

/** A full-length alignment guide. `canvas` marks alignment to the page center. */
export interface Guide {
  axis: 'v' | 'h'
  pos: number
  canvas: boolean
}

/** A center-to-center distance indicator drawn along one axis. */
export interface DistMark {
  axis: 'x' | 'y'
  a: number // start coord along the axis
  b: number // end coord along the axis
  lane: number // the cross-axis position the indicator sits on
  value: number
  equal: boolean // spacing matches the opposite side → highlight
}

export interface SnapResult {
  dx: number
  dy: number
  guides: Guide[]
  dists: DistMark[]
}

export interface SnapOpts {
  threshold: number // snap distance in world units
  neighborTol: number // cross-axis band for "same row/column" neighbours
  canvasW: number
  canvasH: number
}

export function computeSnap(box: Box, others: Pt[], opts: SnapOpts): SnapResult {
  const { threshold, neighborTol, canvasW, canvasH } = opts
  const guides: Guide[] = []
  const dists: DistMark[] = []
  let dx = 0
  let dy = 0

  // ---- X alignment: group left/center/right vs other centers + page center
  const xTargets: { v: number; canvas: boolean }[] = [
    { v: canvasW / 2, canvas: true },
    ...others.map((o) => ({ v: o.x, canvas: false })),
  ]
  const bestX = bestSnap([box.minX, box.cx, box.maxX], xTargets, threshold)
  if (bestX) {
    dx = bestX.delta
    guides.push({ axis: 'v', pos: bestX.target, canvas: bestX.canvas })
  }

  // ---- Y alignment
  const yTargets: { v: number; canvas: boolean }[] = [
    { v: canvasH / 2, canvas: true },
    ...others.map((o) => ({ v: o.y, canvas: false })),
  ]
  const bestY = bestSnap([box.minY, box.cy, box.maxY], yTargets, threshold)
  if (bestY) {
    dy = bestY.delta
    guides.push({ axis: 'h', pos: bestY.target, canvas: bestY.canvas })
  }

  let cx = box.cx + dx
  let cy = box.cy + dy

  // ---- equal-spacing along X (skip if we already snapped on X alignment)
  if (!bestX) {
    const band = others.filter((o) => Math.abs(o.y - cy) <= neighborTol)
    const left = band.filter((o) => o.x < cx).sort((a, b) => b.x - a.x)[0]
    const right = band.filter((o) => o.x > cx).sort((a, b) => a.x - b.x)[0]
    if (left && right) {
      const equal = Math.abs((cx - left.x) - (right.x - cx)) <= threshold
      if (equal) {
        const adj = (left.x + right.x) / 2 - cx
        dx += adj
        cx += adj
      }
      dists.push({ axis: 'x', a: left.x, b: cx, lane: cy, value: Math.round(cx - left.x), equal })
      dists.push({ axis: 'x', a: cx, b: right.x, lane: cy, value: Math.round(right.x - cx), equal })
    }
  }

  // ---- equal-spacing along Y
  if (!bestY) {
    const band = others.filter((o) => Math.abs(o.x - cx) <= neighborTol)
    const top = band.filter((o) => o.y < cy).sort((a, b) => b.y - a.y)[0]
    const bottom = band.filter((o) => o.y > cy).sort((a, b) => a.y - b.y)[0]
    if (top && bottom) {
      const equal = Math.abs((cy - top.y) - (bottom.y - cy)) <= threshold
      if (equal) {
        const adj = (top.y + bottom.y) / 2 - cy
        dy += adj
        cy += adj
      }
      dists.push({ axis: 'y', a: top.y, b: cy, lane: cx, value: Math.round(cy - top.y), equal })
      dists.push({ axis: 'y', a: cy, b: bottom.y, lane: cx, value: Math.round(bottom.y - cy), equal })
    }
  }

  return { dx, dy, guides, dists }
}

function bestSnap(
  refs: number[],
  targets: { v: number; canvas: boolean }[],
  threshold: number,
): { delta: number; target: number; canvas: boolean } | null {
  let best: { delta: number; target: number; canvas: boolean } | null = null
  for (const r of refs) {
    for (const t of targets) {
      const d = t.v - r
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) {
        best = { delta: d, target: t.v, canvas: t.canvas }
      }
    }
  }
  return best
}

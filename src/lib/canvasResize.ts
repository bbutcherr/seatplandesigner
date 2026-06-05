// Pure math for resizing the canvas page by dragging an edge/corner handle.

export type ResizeEdge = 'r' | 'b' | 'br'

export interface ResizeOpts {
  startW: number
  startH: number
  keepAspect: boolean // lock aspect ratio (Shift) — only meaningful for 'br'
  snap: number // round each dimension to this step (e.g. 10, or 1 with Alt)
  min: number // minimum dimension
}

function roundTo(v: number, step: number): number {
  if (step <= 1) return Math.round(v)
  return Math.round(v / step) * step
}

/** Given the dragged edge and the current pointer in world coordinates,
 *  compute the new canvas width/height. The page's top-left is the origin,
 *  so the right/bottom edges follow the pointer directly. */
export function computeCanvasSize(
  edge: ResizeEdge,
  worldX: number,
  worldY: number,
  o: ResizeOpts,
): { width: number; height: number } {
  let width = o.startW
  let height = o.startH

  if (edge === 'r' || edge === 'br') width = worldX
  if (edge === 'b' || edge === 'br') height = worldY

  width = Math.max(o.min, roundTo(width, o.snap))
  height = Math.max(o.min, roundTo(height, o.snap))

  if (o.keepAspect && edge === 'br' && o.startW > 0 && o.startH > 0) {
    // Scale both by the larger ratio so the page keeps its aspect ratio.
    const ratio = Math.max(width / o.startW, height / o.startH)
    width = Math.max(o.min, Math.round(o.startW * ratio))
    height = Math.max(o.min, Math.round(o.startH * ratio))
  }

  return { width, height }
}

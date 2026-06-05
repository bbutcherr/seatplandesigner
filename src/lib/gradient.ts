import type { Configuration } from '../types'

/** Konva Rect fill props for the canvas background — a solid colour or a
 *  linear/radial gradient between canvasColor and canvasColor2. */
export function konvaBgFill(cfg: Configuration): Record<string, unknown> {
  const { canvasGradient: g, canvasColor: c1, canvasColor2: c2, width, height } = cfg
  if (g === 'none') return { fill: c1 }
  const stops = [0, c1, 1, c2]
  if (g === 'radial') {
    return {
      fillRadialGradientStartPoint: { x: width / 2, y: height / 2 },
      fillRadialGradientEndPoint: { x: width / 2, y: height / 2 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: Math.max(width, height) / 2,
      fillRadialGradientColorStops: stops,
    }
  }
  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: g === 'horizontal' ? { x: width, y: 0 } : { x: 0, y: height },
    fillLinearGradientColorStops: stops,
  }
}

/** SVG `<defs>` + a `fill` value for the background rect. */
export function svgBgFill(cfg: Configuration, id = 'bg-grad'): { defs: string; fill: string } {
  const { canvasGradient: g, canvasColor: c1, canvasColor2: c2 } = cfg
  if (g === 'none') return { defs: '', fill: c1 }
  if (g === 'radial') {
    return {
      defs: `<defs><radialGradient id="${id}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient></defs>`,
      fill: `url(#${id})`,
    }
  }
  const coords = g === 'horizontal' ? 'x1="0%" y1="0%" x2="100%" y2="0%"' : 'x1="0%" y1="0%" x2="0%" y2="100%"'
  return {
    defs: `<defs><linearGradient id="${id}" ${coords}><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>`,
    fill: `url(#${id})`,
  }
}

import type { FloorElement, Label, Plan } from '../types'
import { svgBgFill } from './gradient'

const ANCHOR = { left: 'start', center: 'middle', right: 'end' } as const

function labelToSvg(l: Label): string {
  const weight = l.bold ? ' font-weight="bold"' : ''
  const style = l.italic ? ' font-style="italic"' : ''
  const anchor = ANCHOR[l.align]
  // y + fontSize ≈ baseline so it visually matches Konva's top-anchored text.
  return `<g transform="translate(${l.x} ${l.y}) rotate(${l.rotation})"><text x="0" y="${l.fontSize}" font-size="${l.fontSize}" font-family="${esc(l.fontFamily)}"${weight}${style} fill="${esc(l.color)}" text-anchor="${anchor}">${esc(l.text)}</text></g>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function floorToSvg(el: FloorElement): string {
  const g = `translate(${el.x} ${el.y}) rotate(${el.rotation})`
  const stroke = `stroke="${esc(el.stroke)}" stroke-width="${el.strokeWidth}"`
  if (el.type === 'text') {
    return `<g transform="${g}"><text x="0" y="${el.fontSize}" font-size="${el.fontSize}" font-weight="bold" fill="${esc(el.fill)}" font-family="sans-serif">${esc(el.label)}</text></g>`
  }
  if (el.type === 'line') {
    const pts = el.points ?? [0, 0, el.width, el.height]
    const pairs: string[] = []
    for (let i = 0; i < pts.length; i += 2) pairs.push(`${pts[i]},${pts[i + 1]}`)
    return `<g transform="${g}"><polyline points="${pairs.join(' ')}" fill="none" stroke="${esc(el.stroke)}" stroke-width="${Math.max(el.strokeWidth, 3)}"/></g>`
  }
  if (el.type === 'circle') {
    const r = Math.max(el.width, el.height) / 2
    const label = el.label
      ? `<text x="${el.width / 2}" y="${el.height / 2 + el.fontSize * 0.35}" font-size="${el.fontSize}" text-anchor="middle" fill="#0f172a" font-family="sans-serif">${esc(el.label)}</text>`
      : ''
    return `<g transform="${g}"><circle cx="${el.width / 2}" cy="${el.height / 2}" r="${r}" fill="${esc(el.fill)}" ${stroke}/>${label}</g>`
  }
  // rect / stage
  const rx = el.type === 'stage' ? 4 : 2
  const labelColor = el.type === 'stage' ? '#f8fafc' : '#0f172a'
  const label = el.label
    ? `<text x="${el.width / 2}" y="${el.height / 2 + el.fontSize * 0.35}" font-size="${el.fontSize}" font-weight="bold" text-anchor="middle" fill="${labelColor}" font-family="sans-serif">${esc(el.label)}</text>`
    : ''
  return `<g transform="${g}"><rect width="${el.width}" height="${el.height}" rx="${rx}" fill="${esc(el.fill)}" ${stroke}/>${label}</g>`
}

/** Render a plan to an SVG string. This is an internal rendering step only —
 *  it is rasterized to a WebP image by lib/raster.ts and is NOT part of the
 *  exported JSON. Background image hrefs may be remote URLs or data URLs. */
export function planToSvg(plan: Plan): string {
  const { width, height, backgroundUrl, seatRadius, seatLabelSize, showSeatLabels } =
    plan.configuration
  const byId = new Map(plan.products.map((p) => [p.id, p]))
  const labelFs = seatLabelSize
  const bg = svgBgFill(plan.configuration)

  const out: string[] = []
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  )
  if (bg.defs) out.push(bg.defs)
  out.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${bg.fill}"/>`)
  if (backgroundUrl) {
    out.push(
      `<image href="${esc(backgroundUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>`,
    )
  }
  for (const el of plan.floorElements) out.push(floorToSvg(el))
  for (const seat of plan.seats) {
    const product = byId.get(seat.productId)
    const fill = product?.color ?? '#888888'
    const r = product?.radius ?? seatRadius
    out.push(
      `<circle cx="${seat.x}" cy="${seat.y}" r="${r}" fill="${esc(fill)}" stroke="#1f2937" stroke-width="1"/>`,
    )
    if (showSeatLabels) {
      out.push(
        `<text x="${seat.x}" y="${seat.y + labelFs * 0.35}" font-size="${labelFs}" text-anchor="middle" fill="#0f172a" font-family="sans-serif">${esc(seat.label)}</text>`,
      )
    }
  }
  for (const l of plan.labels) out.push(labelToSvg(l))
  out.push('</svg>')
  return out.join('\n')
}

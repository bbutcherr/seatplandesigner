import type { Plan } from '../types'
import { planToSvg } from './svg'

export type ImageType = 'image/webp' | 'image/png' | 'image/jpeg'

/**
 * Render a plan to a raster image Blob (WebP by default).
 *
 * The plan is drawn deterministically at its configured pixel size via an
 * internal vector render, so the result is independent of the on-screen zoom
 * and never includes selection highlights. Note: a *remote* background URL can
 * taint the canvas (CORS) and make encoding fail — uploaded/baked (data URL)
 * backgrounds always work.
 */
export async function planToImageBlob(
  plan: Plan,
  type: ImageType = 'image/webp',
  quality = 0.92,
): Promise<Blob> {
  const { width, height, canvasColor } = plan.configuration
  const svg = planToSvg(plan)
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = await loadImage(svgUrl)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    // JPEG has no alpha — flatten onto the canvas color first.
    ctx.fillStyle = canvasColor || '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return await canvasToBlob(canvas, type, quality)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export async function downloadPlanImage(
  plan: Plan,
  filename: string,
  type: ImageType = 'image/webp',
  quality = 0.92,
): Promise<void> {
  const blob = await planToImageBlob(plan, type, quality)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Fetch an image URL and convert it to a self-contained data URL so it can
 *  be embedded in the exported JSON. Throws on CORS-tainted remote images. */
export async function urlToDataUrl(url: string, type = 'image/webp', quality = 0.92): Promise<string> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  const loaded = new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('Could not load the image'))
  })
  img.src = url
  await loaded
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  return canvas.toDataURL(type, quality)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not render the plan to an image'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      type,
      quality,
    )
  })
}

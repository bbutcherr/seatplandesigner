import type {
  ExportedBundle,
  ExportedConfiguration,
  ExportedPlan,
  Plan,
  Project,
} from '../types'

/** Format a Date as `YYYY-MM-DDTHH:MM:SS+00:00`, matching the sample. */
function formatExportedAt(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

export function planToExported(plan: Plan): ExportedPlan {
  const byId = new Map(plan.products.map((p) => [p.id, p]))

  const productColors: Record<string, string> = {}
  const productSelectedColors: Record<string, string> = {}
  const productSizes: Record<string, number> = {}
  for (const p of plan.products) {
    const key = `product_${p.numId}`
    productColors[key] = p.color
    productSelectedColors[key] = p.selectedColor
    productSizes[key] = p.radius
  }

  const configuration: ExportedConfiguration = {
    width: plan.configuration.width,
    height: plan.configuration.height,
    backgroundUrl: plan.configuration.backgroundUrl,
    seatRadius: plan.configuration.seatRadius,
    productColors,
    productSelectedColors,
    productSizes,
    auto_zoom_enabled: plan.configuration.autoZoomEnabled,
    auto_zoom_level: plan.configuration.autoZoomLevel,
    auto_zoom_target: plan.configuration.autoZoomTarget,
    canvas_color: plan.configuration.canvasColor,
    canvas_color2: plan.configuration.canvasColor2,
    canvas_gradient: plan.configuration.canvasGradient,
    seat_label_size: plan.configuration.seatLabelSize,
    show_seat_labels: plan.configuration.showSeatLabels,
  }

  return {
    name: plan.name,
    configuration,
    seats: plan.seats.map((seat) => ({
      label: seat.label,
      x_pos: Math.round(seat.x),
      y_pos: Math.round(seat.y),
      product_name: byId.get(seat.productId)?.name ?? 'Unknown',
      ...(seat.arcId ? { arc_id: seat.arcId } : {}),
    })),
    labels: plan.labels.map((l) => ({
      text: l.text,
      x_pos: Math.round(l.x),
      y_pos: Math.round(l.y),
      color: l.color,
      font_family: l.fontFamily,
      font_size: l.fontSize,
      bold: l.bold,
      italic: l.italic,
      align: l.align,
      rotation: l.rotation,
      row: l.row,
    })),
    floor_elements: plan.floorElements.map((f) => ({
      type: f.type,
      x_pos: Math.round(f.x),
      y_pos: Math.round(f.y),
      width: Math.round(f.width),
      height: Math.round(f.height),
      ...(f.points ? { points: f.points } : {}),
      rotation: f.rotation,
      fill: f.fill,
      stroke: f.stroke,
      stroke_width: f.strokeWidth,
      label: f.label,
      font_size: f.fontSize,
    })),
    arc_blocks: plan.arcBlocks.map((b) => ({
      id: b.id,
      center_x: Math.round(b.centerX),
      center_y: Math.round(b.centerY),
      base_radius: Math.round(b.baseRadius),
      row_gap: b.rowGap,
      rows: b.rows,
      cols: b.cols,
      start_angle: b.startAngleDeg,
      end_angle: b.endAngleDeg,
      prefix: b.prefix,
      row_start: b.rowStart,
      seat_start: b.seatStart,
      product_name: byId.get(b.productId)?.name ?? 'Unknown',
    })),
  }
}

export function projectToBundle(project: Project, now: Date): ExportedBundle {
  return {
    version: project.version || 1,
    exported_at: formatExportedAt(now),
    source_event: project.sourceEvent,
    plans: project.plans.map(planToExported),
  }
}

function downloadBlob(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Serialize an export bundle to a pretty JSON string. */
export function bundleToJson(bundle: ExportedBundle): string {
  return JSON.stringify(bundle, null, 2)
}

export function downloadJson(bundle: ExportedBundle, filename: string): void {
  downloadBlob(bundleToJson(bundle), 'application/json', filename)
}

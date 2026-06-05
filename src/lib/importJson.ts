import type {
  ArcBlock,
  ExportedBundle,
  FloorElement,
  FloorElementType,
  Plan,
  Product,
  Project,
  Seat,
} from '../types'
import { PALETTE, brighten, defaultConfiguration } from '../store/useDesignerStore'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/**
 * Parse an exported bundle back into the internal model.
 *
 * Note: the exported JSON keys colors by `product_<N>` but seats reference
 * product *names*, and the file carries no name→N mapping. We therefore
 * rebuild products from the unique seat product_names and assign colors
 * positionally from the productColors map (falling back to the palette).
 * Colors may not line up perfectly with the original on round-trip.
 */
export function bundleToProject(bundle: ExportedBundle): Project {
  const plans: Plan[] = bundle.plans.map((ep) => {
    const cfg = ep.configuration ?? {}
    const colorValues = Object.values(cfg.productColors ?? {})
    const selectedValues = Object.values(cfg.productSelectedColors ?? {})
    const sizeValues = Object.values(cfg.productSizes ?? {})

    // unique product names in first-seen order
    const names: string[] = []
    for (const seat of ep.seats ?? []) {
      if (!names.includes(seat.product_name)) names.push(seat.product_name)
    }
    if (names.length === 0) names.push('Standard')

    const fallbackRadius = cfg.seatRadius ?? 15
    const products: Product[] = names.map((name, i) => {
      const base = colorValues[i] ?? PALETTE[i % PALETTE.length]
      return {
        id: uid(),
        numId: i + 1,
        name,
        color: base,
        selectedColor: selectedValues[i] ?? brighten(base),
        radius: (sizeValues[i] as number) ?? fallbackRadius,
      }
    })
    const productByName = new Map(products.map((p) => [p.name, p]))

    // Rebuild arc blocks first so seats can be re-linked to them by id.
    const arcIdMap = new Map<string, string>()
    const arcBlocks: ArcBlock[] = (ep.arc_blocks ?? []).map((b) => {
      const id = uid()
      arcIdMap.set(b.id, id)
      return {
        id,
        centerX: b.center_x ?? 0,
        centerY: b.center_y ?? 0,
        baseRadius: b.base_radius ?? 100,
        rowGap: b.row_gap ?? 40,
        rows: b.rows ?? 1,
        cols: b.cols ?? 1,
        startAngleDeg: b.start_angle ?? 200,
        endAngleDeg: b.end_angle ?? 340,
        prefix: b.prefix ?? '',
        rowStart: b.row_start ?? 'A',
        seatStart: b.seat_start ?? 1,
        productId: (productByName.get(b.product_name) ?? products[0]).id,
      }
    })

    const seats: Seat[] = (ep.seats ?? []).map((s) => ({
      id: uid(),
      label: s.label,
      x: s.x_pos,
      y: s.y_pos,
      productId: (productByName.get(s.product_name) ?? products[0]).id,
      ...(s.arc_id && arcIdMap.has(s.arc_id) ? { arcId: arcIdMap.get(s.arc_id) } : {}),
    }))

    const base = defaultConfiguration()
    return {
      id: uid(),
      name: ep.name || 'Imported plan',
      configuration: {
        width: cfg.width ?? base.width,
        height: cfg.height ?? base.height,
        backgroundUrl: cfg.backgroundUrl ?? '',
        canvasColor: cfg.canvas_color ?? base.canvasColor,
        canvasColor2: cfg.canvas_color2 ?? base.canvasColor2,
        canvasGradient:
          (cfg.canvas_gradient as Plan['configuration']['canvasGradient']) ?? base.canvasGradient,
        seatRadius: cfg.seatRadius ?? base.seatRadius,
        seatLabelSize: cfg.seat_label_size ?? base.seatLabelSize,
        showSeatLabels: cfg.show_seat_labels ?? base.showSeatLabels,
        autoZoomEnabled: cfg.auto_zoom_enabled ?? base.autoZoomEnabled,
        autoZoomLevel: cfg.auto_zoom_level ?? base.autoZoomLevel,
        autoZoomTarget:
          (cfg.auto_zoom_target as Plan['configuration']['autoZoomTarget']) ??
          base.autoZoomTarget,
      },
      products,
      seats,
      floorElements: (ep.floor_elements ?? []).map((f): FloorElement => ({
        id: uid(),
        type: (f.type as FloorElementType) ?? 'rect',
        x: f.x_pos ?? 0,
        y: f.y_pos ?? 0,
        width: f.width ?? 20,
        height: f.height ?? 20,
        ...(f.points ? { points: f.points } : {}),
        rotation: f.rotation ?? 0,
        fill: f.fill ?? '#e2e8f0',
        stroke: f.stroke ?? '#64748b',
        strokeWidth: f.stroke_width ?? 2,
        label: f.label ?? '',
        fontSize: f.font_size ?? 18,
      })),
      labels: (ep.labels ?? []).map((l) => ({
        id: uid(),
        text: l.text ?? '',
        x: l.x_pos ?? 0,
        y: l.y_pos ?? 0,
        color: l.color ?? '#0f172a',
        fontFamily: l.font_family ?? 'sans-serif',
        fontSize: l.font_size ?? 20,
        bold: !!l.bold,
        italic: !!l.italic,
        align: (l.align as 'left' | 'center' | 'right') ?? 'left',
        rotation: l.rotation ?? 0,
        row: !!l.row,
      })),
      arcBlocks,
    }
  })

  if (plans.length === 0) {
    throw new Error('No plans found in file')
  }

  return {
    version: bundle.version ?? 1,
    sourceEvent: bundle.source_event ?? 'Imported event',
    plans,
    activePlanId: plans[0].id,
  }
}

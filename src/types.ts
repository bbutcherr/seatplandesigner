// ---- Internal data model ------------------------------------------------
// The designer keeps a richer model than the exported JSON. On export we
// flatten it into the exact shape of SampleJson/seating-plans-4.json.

export type ID = string

/** A ticket category. `numId` becomes the `product_<numId>` key in the
 *  exported productColors / productSelectedColors maps. */
export interface Product {
  id: ID
  numId: number
  name: string
  color: string // unselected fill
  selectedColor: string // fill when a seat is selected/booked
  radius: number // seat size for this type (e.g. a table renders bigger)
}

export interface Seat {
  id: ID
  label: string
  x: number // canvas pixel position (matches exported x_pos)
  y: number
  productId: ID
  arcId?: ID // set when this seat belongs to a parametric arc block
}

/** A parametric concentric-arc block: `rows` arcs (each at a larger radius)
 *  of `cols` seats. The radius handle shifts every row out by the same amount
 *  (gaps stay constant). */
export interface ArcBlock {
  id: ID
  centerX: number
  centerY: number
  baseRadius: number // radius of the innermost row
  rowGap: number // radius increment per row
  rows: number
  cols: number
  startAngleDeg: number
  endAngleDeg: number
  prefix: string
  rowStart: string // first row token (e.g. 'A')
  seatStart: number // first seat number per row
  productId: ID
}

export type FloorElementType = 'rect' | 'stage' | 'line' | 'circle' | 'text'

/** A non-seat element used to draw a floor plan when there is no
 *  background image (walls, stage, blocks, text labels). These are a
 *  design-time aid; they are not part of the seat JSON unless the floor
 *  layer is rasterized into the background image. */
export interface FloorElement {
  id: ID
  type: FloorElementType
  x: number
  y: number
  width: number
  height: number
  points?: number[] // for 'line': [x1,y1,x2,y2,...] relative to x,y
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  label: string
  fontSize: number
}

/** An exported, styled text annotation: free labels and auto row labels. */
export interface Label {
  id: ID
  text: string
  x: number
  y: number
  color: string
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  align: 'left' | 'center' | 'right'
  rotation: number
  row: boolean // true if produced by the row-label generator
}

export interface Configuration {
  width: number
  height: number
  backgroundUrl: string
  canvasColor: string // page background fill (gradient start when enabled)
  canvasColor2: string // gradient end colour
  canvasGradient: 'none' | 'horizontal' | 'vertical' | 'radial'
  seatRadius: number
  seatLabelSize: number // font size of the number drawn on each seat
  showSeatLabels: boolean
  autoZoomEnabled: boolean
  autoZoomLevel: number
  autoZoomTarget: 'both' | 'horizontal' | 'vertical'
}

export interface Plan {
  id: ID
  name: string
  configuration: Configuration
  products: Product[]
  seats: Seat[]
  floorElements: FloorElement[]
  labels: Label[]
  arcBlocks: ArcBlock[]
}

export interface Project {
  version: number
  sourceEvent: string
  plans: Plan[]
  activePlanId: ID
}

// ---- Exported JSON shape (must match the sample exactly) ----------------

export interface ExportedSeat {
  label: string
  x_pos: number
  y_pos: number
  product_name: string
  arc_id?: string // present only for seats belonging to an arc block
}

export interface ExportedArcBlock {
  id: string
  center_x: number
  center_y: number
  base_radius: number
  row_gap: number
  rows: number
  cols: number
  start_angle: number
  end_angle: number
  prefix: string
  row_start: string
  seat_start: number
  product_name: string
}

export interface ExportedConfiguration {
  width: number
  height: number
  backgroundUrl: string
  seatRadius: number
  productColors: Record<string, string>
  productSelectedColors: Record<string, string>
  productSizes: Record<string, number>
  auto_zoom_enabled: boolean
  auto_zoom_level: number
  auto_zoom_target: string
  canvas_color: string // page background colour (self-contained extension)
  canvas_color2: string // gradient end colour
  canvas_gradient: string // 'none' | 'horizontal' | 'vertical' | 'radial'
  seat_label_size: number
  show_seat_labels: boolean
}

export interface ExportedFloorElement {
  type: string
  x_pos: number
  y_pos: number
  width: number
  height: number
  points?: number[]
  rotation: number
  fill: string
  stroke: string
  stroke_width: number
  label: string
  font_size: number
}

export interface ExportedLabel {
  text: string
  x_pos: number
  y_pos: number
  color: string
  font_family: string
  font_size: number
  bold: boolean
  italic: boolean
  align: string
  rotation: number
  row: boolean
}

export interface ExportedPlan {
  name: string
  configuration: ExportedConfiguration
  seats: ExportedSeat[]
  labels: ExportedLabel[]
  floor_elements: ExportedFloorElement[]
  arc_blocks: ExportedArcBlock[]
}

export interface ExportedBundle {
  version: number
  exported_at: string
  source_event: string
  plans: ExportedPlan[]
}

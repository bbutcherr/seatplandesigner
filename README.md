# Seat Plan Designer

A visual designer for building seating plans and exporting them to the exact
JSON format in `SampleJson/seating-plans-4.json`.

## Stack

React + TypeScript + Vite, with [Konva](https://konvajs.org/) (`react-konva`)
for the canvas and [Zustand](https://github.com/pmndrs/zustand) for state.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## What it does

- **Canvas** — pan (hold <kbd>Space</kbd> + drag, or middle-mouse), zoom
  (scroll), and a **Fit** button. Configurable width / height / seat radius.
- **Bulk seats** — four ways to add seats:
  - **Grid** — rows × columns with X/Y spacing and auto row/seat labels.
  - **Row** — a single straight (optionally angled) row.
  - **Arc** — a parametric **concentric arc block** (rows × columns): row A is
    the inner arc at *base radius*, each next row adds *row gap* (larger radius).
    Stays editable — select it (Arc-blocks panel) and **drag the blue radius
    handle on the canvas** to shift every row outward together (gaps constant),
    or drag the center handle to move it. Saved to `arc_blocks[]` and restored on
    import (seats link by `arc_id`), so the radius stays adjustable after a
    round-trip.
  - **Click** — drop seats one at a time on the canvas.
- **Ticket types** — each type has a name, an unselected color, a
  selected/booked color, and a **seat size (radius)** — so e.g. a "Table of 4"
  renders as a bigger circle than a regular seat. Set the active type, recolor,
  resize, and apply a type to the current selection. Sizes export as
  `configuration.productSizes` (keyed `product_N`) and round-trip.
- **Canvas size** — resize the page directly on the stage: drag the handles on
  the right edge, bottom edge, or bottom-right corner (Shift locks aspect ratio,
  Alt gives 1px precision, a live W×H readout follows the cursor). An on-canvas
  box also takes exact width/height, **size presets**, and **Match image** (set
  the canvas to a loaded background's natural pixels). Resizing only changes the
  page bounds — seats and floor elements keep their positions.
- **Labels** — styled text annotations that **are exported in the JSON** (a
  `labels` array per plan) and rendered into the image. Place free labels with
  the Label tool, or auto-generate **row labels** at both ends of every row
  (grouped by seat-label prefix: A1, A2 → "A"; re-running replaces them). Each
  label has text, color, font family, size, bold/italic, alignment, and
  rotation, all editable in Properties. (Distinct from "floor text", which is
  baked into the background image, not the JSON.)
- **Canvas color / shading** — set the page background colour, or a **gradient
  shade** (Canvas panel → Shade: vertical / horizontal / radial) between two
  colours. Renders live, is baked into the exported image, and is written to the
  JSON (`canvas_color`, `canvas_color2`, `canvas_gradient`) so it round-trips.
- **Background / floor plan** — paste an image URL or upload an image (a remote
  URL can be embedded as a data URL via **Embed in JSON** for full
  self-containment). With no image, draw a floor plan from building elements
  (block, stage, wall/line, circle, text label) and label them. These
  **floor elements are written to the JSON** (`floor_elements[]`) and restored on
  import; you can also **bake** them into the background image.
- **Selection & editing** — click, shift-click, or marquee-drag to select
  seats; drag to move them together; edit label / position / type in the
  Properties panel; <kbd>Del</kbd> to remove. Copy/paste with
  <kbd>Ctrl/⌘+C</kbd>/<kbd>V</kbd> (preserves ticket type, colors, and relative
  geometry; auto-unique labels), or <kbd>Ctrl/⌘+D</kbd> to duplicate.
- **Align & smart guides** — the Align panel aligns the selection
  (left/center/right, top/middle/bottom), distributes it evenly, or centers it
  on the page. While dragging, Visio-style guides appear: red/purple snap lines
  when centers or edges line up (purple = page center), and center-to-center
  **distance indicators** that turn green when the spacing on both sides is
  equal. Hold <kbd>Alt</kbd> to bypass snapping, or toggle Snap off in the
  panel.
- **Plans** — multiple plans per event (tabs), duplicate, rename.
- **✨ Example** — one click adds a fully-built example auditorium as a new plan
  (VIP + stalls + a concentric circle arc block, a stage with side walls, ticket
  types with colours, section labels, canvas colour). It's ordinary designer
  data, so you then adjust everything with the on-screen tools (move, recolor,
  drag the arc radius, relabel, resize). Press **Fit** to frame it.
- **Export / Import** — **Export JSON** downloads a bundle matching the sample
  schema exactly (`label/x_pos/y_pos/product_name`, product colors,
  configuration) — pure data, no image embedded. Export is **validated**: every
  seat must have a ticket type assigned; if any don't, export is blocked, the
  offending seats are selected (and the plan switched to), and the status bar
  shows a live count. **Copy JSON** copies the same validated bundle to the
  clipboard (with a fallback for non-secure contexts). **Export WebP** separately renders the active plan to a
  raster image (canvas color + background + floor + colored seats) and downloads
  it as a `.webp` file. Re-import restores the plan from the JSON. (Background
  image uploads are restricted to JPEG/PNG/WebP.)

## Exported JSON shape

```jsonc
{
  "version": 1,
  "exported_at": "2026-06-05T06:08:27+00:00",
  "source_event": "My Event",
  "plans": [
    {
      "name": "Theatre",
      "configuration": {
        "width": 1400, "height": 1570,
        "backgroundUrl": "…",
        "seatRadius": 15,
        "productColors":         { "product_1": "#2d9c6c", … },
        "productSelectedColors": { "product_1": "#1bde14", … },
        "productSizes":          { "product_1": 15, "product_2": 28, … },
        "auto_zoom_enabled": true, "auto_zoom_level": 5, "auto_zoom_target": "both"
      },
      "seats": [
        { "label": "AA1", "x_pos": 460, "y_pos": 63, "product_name": "Front-VIP" }
      ],
      "labels": [
        { "text": "A", "x_pos": 70, "y_pos": 105, "color": "#0f172a",
          "font_family": "sans-serif", "font_size": 20, "bold": true,
          "italic": false, "align": "right", "rotation": 0, "row": true }
      ]
    }
  ]
}
```

The JSON is **self-contained**: beyond the original sample fields it adds
`configuration.canvas_color`, a `labels[]` array, and a `floor_elements[]` array
(type, position, size, points, rotation, fill/stroke, label, font size). With an
uploaded/embedded (data-URL) background, a JSON import reconstructs the entire
plan with no external data. Everything from the original sample still matches.

### Products vs. colors

Internally each ticket type carries a numeric id; on export it becomes the
`product_<id>` key in `productColors` / `productSelectedColors`, while seats
reference the type by `product_name` — exactly like the sample. The sample file
itself carries no name→id mapping, so on **import** colors are matched to the
unique product names positionally (best-effort); recolor in the Ticket types
panel if needed.

## Layout

```
src/
  types.ts                  internal model + exported JSON types
  store/useDesignerStore.ts Zustand store (plans, seats, products, floor, selection)
  lib/
    labels.ts               row/seat label helpers
    seatGenerators.ts       grid / row / arc generators
    exportJson.ts           project → sample-shaped bundle + download
    importJson.ts           bundle → internal project
  components/
    DesignCanvas.tsx        Konva stage: pan/zoom, select, move, draw
    useImage.ts             background image loader
    panels/                 TopBar, Toolbar, Config, Product, BulkSeat, Floor, Properties
```

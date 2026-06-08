# Authoring guide — how to create seats & plans in code

> **Policy gate (read `LLM_GUARDRAILS.md` first):** when composing a plan **for a
> user**, produce it as **JSON** using the schema in `RENDERING.md` — do not edit
> app code. The patterns below show what's *expressible*; translate them to JSON.
> Writing new template builders / changing `src/**` (this file's code examples) is
> an **application-code change** — only do that with explicit permission.


Read this before building seats, sections, or templates. It documents the data
model, the seat generators, and the proven patterns (flat blocks, per-row ticket
types, curved amphitheatres) so you don't have to re-derive them. Companion docs:
`RENDERING.md` (how a consumer renders the exported JSON) and `README.md` (the app).

## Where things live

| File | What |
|---|---|
| `src/types.ts` | Data model (Plan, Seat, Product, ArcBlock, FloorElement, Label, Configuration) and the exported JSON shapes. |
| `src/lib/seatGenerators.ts` | Pure functions that return seat positions: `generateGrid`, `generateRow`, `generateArc`, `generateArcBlock`. |
| `src/lib/labels.ts` | `rowLabel`, `seatLabel`, `rowToken`, `indexToAlpha`. |
| `src/store/useDesignerStore.ts` | Zustand store = the actions the UI calls (`addSeats`, `createArcBlock`, `addProduct`, …) and `defaultConfiguration()`. |
| `src/lib/sampleProject.ts` | **Template builders** (`buildExamplePlan`, `buildFestivalPlan`) + the `TEMPLATES` registry. Copy these as your starting point. |
| `src/lib/exportJson.ts` / `importJson.ts` | Internal model ⇄ JSON. |
| `scripts/*.ts` | Headless verification scripts (build a plan, assert, regenerate sample JSON). |

## Coordinate system & angles

- Pixels; origin top-left; **y increases downward** (like screen/SVG).
- A plan is a `width × height` page (`configuration`). Keep everything inside `[0,width] × [0,height]`.
- Angles (for rows/arcs): **0° = right, 90° = down, 180° = left, 270° = up.**
  - A fan **facing a stage at the top** uses a focal centre *above* the seats and angles around 90° (e.g. `60°–120°`); rows fan downward, smaller radius = closer to the stage.

## Data model (the essentials)

```ts
Seat        { id, label, x, y, productId, arcId? }       // arcId set if part of an arc block
Product     { id, numId, name, color, selectedColor, radius }   // radius = this type's seat size
ArcBlock    { id, centerX, centerY, baseRadius, rowGap, rows, cols,
              startAngleDeg, endAngleDeg, prefix, rowStart, seatStart, productId }
FloorElement{ id, type:'rect'|'stage'|'line'|'circle'|'text', x, y, width, height,
              points?, rotation, fill, stroke, strokeWidth, label, fontSize }
Label       { id, text, x, y, color, fontFamily, fontSize, bold, italic, align, rotation, row }
Configuration { width, height, backgroundUrl, canvasColor, canvasColor2,
              canvasGradient:'none'|'horizontal'|'vertical'|'radial',
              seatRadius, seatLabelSize, showSeatLabels,
              autoZoomEnabled, autoZoomLevel, autoZoomTarget }
Plan        { id, name, configuration, products, seats, floorElements, labels, arcBlocks }
```

## Two ways to create seats

### A) Interactive (store actions) — when modifying the live app
```ts
const st = useDesignerStore.getState
st().addProduct('VIP'); const vip = st().activeProductId
st().updateProduct(vip, { color: '#e39012', radius: 16 })
st().setActiveProduct(vip)
st().addSeats(generateGrid({ rows: 5, cols: 10, startX: 300, startY: 300, xSpacing: 40, ySpacing: 42, prefix: '', rowMode: 'alpha', rowStart: 'A', seatStart: 1 }))
st().createArcBlock({ centerX: 800, centerY: 1300, baseRadius: 520, rowGap: 44, rows: 3, cols: 18, startAngleDeg: 214, endAngleDeg: 326, prefix: 'C', rowStart: 'A', seatStart: 1 })
```
`addSeats(drafts, productId?)` uses the **active product** if `productId` is omitted.
`createArcBlock(params)` creates the block **and** its seats and selects it.

### B) Build a Plan object directly — for templates (preferred for rich layouts)
Copy `buildExamplePlan` / `buildFestivalPlan` in `src/lib/sampleProject.ts`. You
assemble `products`, `seats`, `floorElements`, `labels`, `arcBlocks` and return a
`Plan`. Use the local `uid()` and `product()` helpers there, and spread
`defaultConfiguration()` then override.

## Seat generators (return `{label, x, y}[]`)

```ts
generateGrid({ rows, cols, startX, startY, xSpacing, ySpacing,
               prefix, rowMode:'alpha'|'numeric', rowStart:'A', seatStart:1 })
generateRow ({ count, startX, startY, spacing, prefix, row:'A', seatStart:1, angleDeg:0 })
generateArc ({ count, centerX, centerY, radius, startAngleDeg, endAngleDeg, prefix, row, seatStart, faceOutward:true })  // single curved row
generateArcBlock({ centerX, centerY, baseRadius, rowGap, rows, cols,
                   startAngleDeg, endAngleDeg, prefix, rowStart:'A', seatStart:1 })  // concentric rows
```
Labels come out as `` `${prefix}${rowLetter}${seatNo}` `` (e.g. `A1`, `CB7`).
Map each draft to a `Seat` with `id: uid()` and the right `productId` (and
`arcId` for arc-block seats).

## Recipe: a grid with per-row ticket types (e.g. "students get the last 3 rows")
Assign the product by **row index**:
```ts
const rows = 20, cols = 25, startX = 320, startY = 360, dx = 42, dy = 42
const seats: Seat[] = []
for (let r = 0; r < rows; r++) {
  const rowName = String.fromCharCode(65 + r)            // A..T
  const pid =
    r < 3            ? vip.id :
    r < 7            ? premium.id :
    r >= rows - 3    ? students.id :                      // ← last 3 rows
                       standard.id
  for (let c = 0; c < cols; c++)
    seats.push({ id: uid(), label: `${rowName}${c+1}`, x: startX + c*dx, y: startY + r*dy, productId: pid })
}
```

## Recipe: a CURVED amphitheatre with multiple ticket types
An `ArcBlock` has **one** product, so a multi-type curve = **several concentric
arc blocks** sharing the same `centerX/centerY/startAngleDeg/endAngleDeg/cols/rowGap`,
with consecutive `baseRadius` and `rowStart` (VIP closest → Students furthest).
This is exactly `buildFestivalPlan`:
```ts
const cx = 1000, cy = -370, cols = 25, gap = 40, startAngle = 60, endAngle = 120
const sections = [
  { name:'VIP', product: vip, rows: 3 },
  { name:'PREMIUM', product: premium, rows: 4 },
  { name:'STANDARD', product: standard, rows: 10 },
  { name:'STUDENTS', product: students, rows: 3 },     // outermost = last rows
]
let baseRadius = 820, rowOffset = 0
for (const sec of sections) {
  const block: ArcBlock = { id: uid(), centerX: cx, centerY: cy, baseRadius, rowGap: gap,
    rows: sec.rows, cols, startAngleDeg: startAngle, endAngleDeg: endAngle,
    prefix: '', rowStart: String.fromCharCode(65 + rowOffset), seatStart: 1, productId: sec.product.id }
  arcBlocks.push(block)
  for (const d of generateArcBlock(block))
    seats.push({ id: uid(), label: d.label, x: d.x, y: d.y, productId: sec.product.id, arcId: block.id })
  baseRadius += sec.rows * gap   // next ring starts past this section
  rowOffset += sec.rows          // continue row letters
}
```
**Fit math:** with `cols` seats per row, the *inner* arc length `baseRadius ×
(span in rad)` must be ≥ `cols × ~1.4 × seatRadius` or inner rows overlap. The
*outer* horizontal half-width is `outerRadius × cos(min|angle−90°|)`; keep
`cx ± that` inside `[0,width]`. Widen the canvas / raise `cx` until it fits.

## Products & the colour mapping rule (important)
- Create products in the order seats first reference them, with `numId = 1,2,3…`.
  On export, colours/sizes are keyed `product_${numId}`; seats carry
  `product_name`. The consumer pairs them by **first-appearance order in
  `seats[]`** (see `RENDERING.md`). So: **make sure the first seat of each type
  appears in product-creation order**, and give every product at least one seat.
- Each product also has its own `radius` (seat size). Use the global
  `adjustSeatSizes(delta)` action to nudge all of them together.

## Floor elements, labels, background
```ts
// floor (stage/block/wall/circle/text) — see buildFestivalPlan for full examples
{ id: uid(), type: 'stage', x, y, width, height, rotation: 0, fill, stroke, strokeWidth, label: 'STAGE', fontSize }
{ id: uid(), type: 'line', x, y, width, height, points: [0,0,0,540], rotation: 0, fill, stroke, strokeWidth, label: '', fontSize }  // points relative to x,y
// label (free or section)
{ id: uid(), text, x, y, color, fontFamily, fontSize, bold, italic, align:'left'|'center'|'right', rotation: 0, row: false }
// gradient background
configuration: { ...defaultConfiguration(), canvasColor:'#1e3a8a', canvasColor2:'#020617', canvasGradient:'radial' }
```
For **row labels**, the store has `generateRowLabels(gap)` (places a label at both
ends of each row, grouped by seat-label prefix; `gap` is clearance past the seat
edge). It needs the live store, so for a static template add section labels
manually (right-aligned labels extend **left** of their `x` — keep `x − textWidth ≥ 0`).

## Add a new template (shows up in the app automatically)
1. Write `export function buildMyPlan(): Plan { … }` in `src/lib/sampleProject.ts`.
2. Add it to the registry:
   ```ts
   export const TEMPLATES = [
     { id: 'example',  name: 'Example auditorium',   build: buildExamplePlan },
     { id: 'festival', name: 'Festival — 500 seats', build: buildFestivalPlan },
     { id: 'myplan',   name: 'My template',          build: buildMyPlan },
   ]
   ```
   The top-bar **✨ Template…** dropdown lists it automatically; selecting it adds
   the plan (non-destructively) via `loadProject`.

## Gotchas / fidelity rules
- **Stay inside the canvas.** Seats (`x ± radius`) and labels (mind `align`) must
  fit `[0,width] × [0,height]`. Right-aligned labels run left of `x`.
- **Students-in-last-rows / sections by row** → assign product by row index, or
  make the outermost arc block the student section.
- **One product per arc block.** Multi-type curve ⇒ multiple concentric blocks.
- **Arc seats need `arcId`** = their block's id (so the block stays editable and
  round-trips; the seat ↔ block link is exported as `arc_id`).
- **Product order = colour mapping.** Keep product creation order aligned with
  first-seen order in `seats[]`; give each product ≥1 seat.
- **Every seat needs a valid `productId`** or export is blocked by validation.

## Verify your work (always do this)
1. `npm run build` — must be clean (`tsc` + `vite`).
2. Write a headless check in `scripts/` and run it (bundles with esbuild, runs in node):
   ```bash
   npx esbuild scripts/my-check.ts --bundle --platform=node --format=esm \
     --outfile=scripts/my-check.mjs --log-level=error && node scripts/my-check.mjs; rm -f scripts/*.mjs
   ```
   Assert the things that matter: seat count, products, per-row/section
   assignment, on-canvas bounds, and a JSON **round-trip**
   (`bundleToProject(projectToBundle(project, fixedDate))`) preserving everything.
   See `scripts/e2e.ts`, `scripts/check9.ts` (arc), and the festival check for patterns.
3. Optionally write the result to `SampleJson/<name>.json` so it can be imported
   in the app. **Do not** start+`pkill` the dev server to "test" — that kills the
   user's running server; use `npm run build` / `curl` instead.

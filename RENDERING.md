# Seat-plan JSON → 1:1 rendering spec

> **Policy:** an LLM serving a user composes the **plan JSON**, it does not change
> the app's code. If a requested view can't be expressed with this schema, stop
> and ask permission, stating it changes the **application code, not the JSON**.
> See `LLM_GUARDRAILS.md`.

This document tells a renderer (or an LLM) exactly how to draw the exported
seating-plan JSON so it matches the designer **pixel-for-pixel**. It mirrors the
app's own renderer (`src/lib/svg.ts`), which produces the WebP export and the
on-canvas view from the same data.

## TL;DR

- **Render to SVG**, not CSS-positioned divs. The plan is a fixed pixel space
  (`configuration.width × height`, absolute `x_pos/y_pos`). An
  `<svg viewBox="0 0 width height">` reproduces those coordinates exactly and
  scales to any screen.
- **CSS is only for seat states** (available/selected/booked, hover) and page
  chrome — never for positioning.
- **Draw order (bottom → top): background → floor_elements → zones → seats → labels.**
- A seat's circle radius and fill come from its **ticket type** (see
  "Product mapping").
- **Zones** are bookable *areas* (general admission) drawn as filled polygons
  with a capacity — some plans use zones **instead of** seats (§7b).
- **Do not render `arc_blocks`** — they are editor metadata; their seats are
  already in `seats[]`.

---

## 1. Top-level structure

```jsonc
{
  "version": 1,
  "exported_at": "2026-06-05T12:00:00+00:00",
  "source_event": "Grand Gala 2026",
  "plans": [ ExportedPlan, ... ]   // one or more; render one plan at a time
}
```

Each `ExportedPlan`:

```jsonc
{
  "name": "Main Hall",
  "configuration": { ... },        // canvas, colours, sizes (see §2)
  "seats": [ ... ],                // §5
  "labels": [ ... ],               // §6 (text annotations + row labels)
  "floor_elements": [ ... ],       // §7 (stage, walls, blocks…)
  "zones": [ ... ],                // §7b bookable AREAS (may be used instead of seats)
  "arc_blocks": [ ... ]            // metadata only — DO NOT draw (§8)
}
```

A plan may have **seats**, **zones**, or **both**. A garden/GA plan can have an
empty `seats` array and only `zones`.

## 2. Configuration

```jsonc
{
  "width": 1600, "height": 1200,        // canvas pixel size → SVG viewBox
  "backgroundUrl": "data:image/…|https://…|''",  // optional bg image
  "seatRadius": 14,                     // fallback seat radius (px)
  "productColors":         { "product_1": "#2d9c6c", ... },  // unselected fill
  "productSelectedColors": { "product_1": "#1bde14", ... },  // selected fill
  "productSizes":          { "product_1": 14, "product_2": 30, ... }, // per-type radius
  "auto_zoom_enabled": true, "auto_zoom_level": 6, "auto_zoom_target": "both",
  "canvas_color": "#0f172a",            // background colour / gradient start
  "canvas_color2": "#1e3a5f",           // gradient end colour
  "canvas_gradient": "none|horizontal|vertical|radial",
  "seat_label_size": 10,                // seat-number font size (px)
  "show_seat_labels": true              // draw seat numbers?
}
```

`auto_zoom_*` are viewer hints (initial zoom); they don't affect 1:1 geometry.

## 3. SVG root & coordinate system

```html
<svg xmlns="http://www.w3.org/2000/svg"
     width="{width}" height="{height}"
     viewBox="0 0 {width} {height}"
     preserveAspectRatio="xMidYMid meet">
  <!-- defs (gradient), then layers in z-order -->
</svg>
```

All coordinates in the JSON are **absolute pixels** in this space. The y-axis
points **down** (origin top-left), like screen/SVG coordinates. To make it
responsive, set CSS `width:100%; height:auto` on the `<svg>` — the `viewBox`
handles scaling; do not recompute coordinates.

## 4. Background (draw first)

Always draw a full-canvas rect. Fill depends on `canvas_gradient`:

- **`none`** → solid: `<rect x="0" y="0" width="W" height="H" fill="{canvas_color}"/>`
- **`vertical`** → top→bottom gradient between `canvas_color` (0%) and `canvas_color2` (100%):
  ```html
  <defs><linearGradient id="bg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="{canvas_color}"/>
    <stop offset="100%" stop-color="{canvas_color2}"/>
  </linearGradient></defs>
  <rect x="0" y="0" width="W" height="H" fill="url(#bg-grad)"/>
  ```
- **`horizontal`** → same but `x1="0%" y1="0%" x2="100%" y2="0%"`.
- **`radial`** → `<radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">` with the same two stops.

Then, **if `backgroundUrl` is non-empty**, draw it over the colour:
```html
<image href="{backgroundUrl}" x="0" y="0" width="W" height="H" preserveAspectRatio="none"/>
```
(`backgroundUrl` may be a `data:` URL — fully self-contained — or a remote URL.)

## 5. Seats (draw after floor elements)

For each item in `seats` (in array order):

```jsonc
{ "label": "A1", "x_pos": 300, "y_pos": 320, "product_name": "Stalls", "arc_id": "…?" }
```

- Resolve the seat's **fill** and **radius** from its ticket type (see "Product
  mapping" below): `r = radiusFor(product_name)`, `fill = colorFor(product_name)`.
- Circle: `<circle cx="{x_pos}" cy="{y_pos}" r="{r}" fill="{fill}" stroke="#1f2937" stroke-width="1"/>`
- If `show_seat_labels` is true, draw the seat number centred on the seat:
  ```html
  <text x="{x_pos}" y="{y_pos + seat_label_size*0.35}" font-size="{seat_label_size}"
        text-anchor="middle" fill="#0f172a" font-family="sans-serif">{label}</text>
  ```
  (The `+ size*0.35` offset approximates vertical centring — match it exactly.)
- `arc_id` is only a grouping hint (which arc block the seat belongs to). Ignore
  it for drawing.

### Product mapping (name → colour / size)  ← read carefully

Seats reference a ticket type by **`product_name`**, but colours/sizes are keyed
by **`product_N`**. The association is by **order**: the keys `product_1,
product_2, …` correspond to the **unique `product_name`s in the order they first
appear in `seats[]`**. Algorithm:

```js
// 1. ordered unique product names, by first appearance across
//    seats → arc_blocks → zones (so zone-only / GA plans still map correctly)
const order = [];
const seen = new Set();
const note = (n) => { if (n && !seen.has(n)) { seen.add(n); order.push(n); } };
for (const s of plan.seats)       note(s.product_name);
for (const b of plan.arc_blocks)  note(b.product_name);
for (const z of plan.zones)       note(z.product_name);

// 2. the i-th name maps to key product_(i+1)
const keyFor   = (name) => `product_${order.indexOf(name) + 1}`;
const colorFor    = (name) => plan.configuration.productColors[keyFor(name)] ?? '#888888';
const selectedFor = (name) => plan.configuration.productSelectedColors[keyFor(name)] ?? colorFor(name);
const radiusFor   = (name) => plan.configuration.productSizes?.[keyFor(name)] ?? plan.configuration.seatRadius;
```

This is exactly how the designer round-trips the data, so it is 1:1 for the
normal case (every ticket type has at least one seat, and seats appear in
ticket-type creation order). **Caveat:** if a ticket type has *no* seats, or the
producer reordered things, the positional mapping can drift. For a
guaranteed-unambiguous mapping, the export can include an explicit
`products: [{ name, color, selected_color, size }]` array — ask the designer
team to add it and key off `name` directly. (Until then, use the rule above.)

## 6. Labels (draw last, on top)

For each item in `labels` (text annotations and auto-generated row labels):

```jsonc
{ "text": "MAIN HALL", "x_pos": 800, "y_pos": 170, "color": "#f8fafc",
  "font_family": "Georgia", "font_size": 30, "bold": true, "italic": false,
  "align": "center", "rotation": 0, "row": true }
```

```html
<g transform="translate({x_pos} {y_pos}) rotate({rotation})">
  <text x="0" y="{font_size}"
        font-size="{font_size}" font-family="{font_family}"
        {bold ? 'font-weight="bold"' : ''} {italic ? 'font-style="italic"' : ''}
        fill="{color}" text-anchor="{anchor}">{text}</text>
</g>
```

- `anchor` from `align`: **left→`start`**, **center→`middle`**, **right→`end`**.
- The text baseline sits at `y_pos + font_size` (note `y="{font_size}"` inside
  the translated group). `rotation` is in degrees, about `(x_pos, y_pos)`.
- `row` just marks auto-generated row labels (style them the same as any label;
  it's informational).

## 7. Floor elements (draw after background, before seats)

For each item in `floor_elements`, wrap in `translate + rotate` about `(x_pos, y_pos)`:

```
<g transform="translate({x_pos} {y_pos}) rotate({rotation})"> … </g>
```

Inside the group (local coordinates), by `type`:

- **`rect`** — `<rect width="{width}" height="{height}" rx="2" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"/>`
  If `label`: `<text x="{width/2}" y="{height/2 + font_size*0.35}" font-size="{font_size}" font-weight="bold" text-anchor="middle" fill="#0f172a" font-family="sans-serif">{label}</text>`
- **`stage`** — same as `rect` but `rx="4"` and the label fill is `#f8fafc` (light, for a dark stage).
- **`circle`** — `<circle cx="{width/2}" cy="{height/2}" r="{max(width,height)/2}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"/>`
  Label (if any) centred like rect, fill `#0f172a`.
- **`line`** — `<polyline points="{points as 'x0,y0 x1,y1 …'}" fill="none" stroke="{stroke}" stroke-width="{max(stroke_width,3)}"/>`
  `points` are **relative to (x_pos, y_pos)**; if `points` is absent use `0,0 width,height`.
- **`text`** — `<text x="0" y="{font_size}" font-size="{font_size}" font-weight="bold" fill="{fill}" font-family="sans-serif">{label}</text>`

## 7b. Zones (bookable areas) — draw after floor, before seats

A **zone** is one bookable region (general admission / a whole tier or table
area) instead of individual seats — capacity-based, not seat-by-seat. Each:

```jsonc
{ "label": "VIP", "points": [570,170, 930,170, 1008,330, 492,330],  // polygon, absolute
  "color": "#e39012", "product_name": "VIP", "capacity": 60 }
```

Draw a filled polygon plus a centred label + capacity:

```html
<polygon points="{points as 'x0,y0 x1,y1 …'}" fill="{color}" fill-opacity="0.5"
         stroke="{color}" stroke-width="2"/>
<text x="{cx}" y="{cy}" font-size="18" font-weight="bold" text-anchor="middle"
      fill="#f8fafc" font-family="sans-serif">{label}<tspan x="{cx}" dy="22">{capacity} cap</tspan></text>
```

- `points` is a flat array `[x0,y0,x1,y1,…]` of **absolute** polygon vertices
  (often 4 for a quad, but any count). The `color` is the zone's own fill
  (not necessarily a product colour). `product_name` is its ticket type;
  `capacity` is how many it admits (omit the `<tspan>` if 0).
- `(cx, cy)` = the **centroid** (average of the vertices) for the label.
- For booking: make the `<polygon>` the clickable element (one "button" per
  area); colour/dim it per state via CSS like seats (§9). Show selected/sold
  counts against `capacity`.

## 8. Arc blocks — do **not** render

`arc_blocks` describe the parametric concentric-arc seating (center, radii,
rows, cols) **for editing only**. Their seats are already present in `seats[]`
(tagged with `arc_id`). Drawing arc blocks would double-draw. Ignore them when
rendering; only an *editor* needs them.

## 9. Interactivity & states (optional, for a booking view)

Geometry stays in SVG; use **CSS classes** on each seat `<circle>` for state:

- `available` → `colorFor(name)`
- `selected` → `selectedFor(name)` (toggle on click/tap)
- `booked`/`unavailable` → a grey, with `pointer-events:none`

Give each seat circle a stable id/data attribute (e.g. `data-label`,
`data-type`) and put `pointer-events:none` on the seat-number `<text>` so the
circle receives taps.

## 10. Responsiveness (browser + mobile)

- The `viewBox` + `width:100%` makes the map scale to its container — no media
  queries needed for the map.
- For phones, wrap the inner content in a `<g transform>` and add a pinch-zoom /
  pan layer (`touch-action:none`) so users can zoom to small seats. Page chrome
  (legend, summary) can stack with normal CSS media queries.

## 11. Fidelity checklist (to actually hit 1:1)

- viewBox is exactly `0 0 width height`; never round/resample coordinates.
- Z-order: background → floor → seats → labels.
- Seat: `r` from `productSizes` (fallback `seatRadius`), `fill` from
  `productColors`, stroke `#1f2937` width `1`.
- Seat number: `font-family:sans-serif`, size `seat_label_size`, `text-anchor:middle`,
  baseline `y_pos + size*0.35`; only when `show_seat_labels`.
- Label: honour `font_family`, `font_size`, `bold`→font-weight, `italic`→font-style,
  `align`→text-anchor, `color`, `rotation`; baseline `y_pos + font_size`.
- Background gradient direction/colours per `canvas_gradient`; image drawn over
  the colour with `preserveAspectRatio="none"`.
- Floor `line` uses `points` relative to its origin and `max(stroke_width, 3)`.
- Keep stroke widths in **user units** (don't scale with CSS) so they look the
  same at any zoom.

## 12. Minimal worked example

Input (1 product, 2 seats, a stage, vertical shade):
```json
{
  "version": 1, "exported_at": "…", "source_event": "Demo",
  "plans": [{
    "name": "P1",
    "configuration": {
      "width": 400, "height": 300, "backgroundUrl": "",
      "seatRadius": 12,
      "productColors": { "product_1": "#2d9c6c" },
      "productSelectedColors": { "product_1": "#1bde14" },
      "productSizes": { "product_1": 12 },
      "auto_zoom_enabled": true, "auto_zoom_level": 5, "auto_zoom_target": "both",
      "canvas_color": "#ffffff", "canvas_color2": "#dbeafe", "canvas_gradient": "vertical",
      "seat_label_size": 10, "show_seat_labels": true
    },
    "seats": [
      { "label": "A1", "x_pos": 160, "y_pos": 200, "product_name": "Stalls" },
      { "label": "A2", "x_pos": 200, "y_pos": 200, "product_name": "Stalls" }
    ],
    "labels": [],
    "floor_elements": [
      { "type": "stage", "x_pos": 120, "y_pos": 40, "width": 160, "height": 40,
        "rotation": 0, "fill": "#1e293b", "stroke": "#0f172a", "stroke_width": 2,
        "label": "STAGE", "font_size": 18 }
    ],
    "arc_blocks": []
  }]
}
```

Output:
```html
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
  <defs><linearGradient id="bg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dbeafe"/>
  </linearGradient></defs>
  <rect x="0" y="0" width="400" height="300" fill="url(#bg-grad)"/>
  <!-- floor -->
  <g transform="translate(120 40) rotate(0)">
    <rect width="160" height="40" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <text x="80" y="26.3" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc" font-family="sans-serif">STAGE</text>
  </g>
  <!-- seats -->
  <circle cx="160" cy="200" r="12" fill="#2d9c6c" stroke="#1f2937" stroke-width="1"/>
  <text x="160" y="203.5" font-size="10" text-anchor="middle" fill="#0f172a" font-family="sans-serif">A1</text>
  <circle cx="200" cy="200" r="12" fill="#2d9c6c" stroke="#1f2937" stroke-width="1"/>
  <text x="200" y="203.5" font-size="10" text-anchor="middle" fill="#0f172a" font-family="sans-serif">A2</text>
</svg>
```

## 13. Algorithm summary (pseudocode)

```
render(plan):
  emit <svg viewBox="0 0 W H" width=W height=H>
  bg = backgroundFill(plan.configuration)         // §4 (solid or gradient defs)
  emit bg.defs; emit <rect 0 0 W H fill=bg.fill>
  if backgroundUrl: emit <image href=backgroundUrl 0 0 W H preserveAspectRatio=none>
  for f in plan.floor_elements: emit floorSvg(f)  // §7
  for z in plan.zones: emit zoneSvg(z)            // §7b (polygon + label + capacity)
  order = uniqueProductNamesByFirstAppearance(plan.seats)   // §5 mapping
  for s in plan.seats:
     emit <circle cx=s.x_pos cy=s.y_pos r=radiusFor(s.product_name)
                  fill=colorFor(s.product_name) stroke=#1f2937 stroke-width=1>
     if show_seat_labels: emit seatNumber(s)
  for l in plan.labels: emit labelSvg(l)          // §6
  emit </svg>
  // arc_blocks: ignored
```

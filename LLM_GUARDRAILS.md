# LLM operating policy — JSON-first gate

**Read this before acting on any "create / change a plan" request.**

Your job is to compose the **plan JSON** (the data) to satisfy the requested
view. You do **not** change the application's source code to render a view.
There is a hard line between *data* (the exported plan JSON) and *code* (the
app/renderer). Stay on the data side unless explicitly told otherwise.

## The gate (decision procedure)

For every requested view/layout, ask: **"Can this be expressed with the existing
JSON schema?"** (the capabilities below; full shape in `RENDERING.md`, patterns
in `AUTHORING.md`).

1. **YES → do it in JSON only.** Compose/modify the plan JSON — seats, zones,
   labels, floor elements, arc blocks, products, configuration. Never touch
   `src/**` or any app code to achieve it.

2. **NO → STOP. Do not edit code.** The request needs a new rendering capability,
   a new entity type, or a field the app doesn't read. In that case:
   - **Do not silently change application code.**
   - Tell the user plainly, using language like:
     > "This can't be done with the plan JSON alone — it requires changing the
     > **application code** (the renderer), not just the data. Shall I proceed
     > with an app-code change?"
   - **Ask for explicit permission**, and only after a clear "yes" may you modify
     `src/**`. When you do, restate that you are now changing the **application**,
     not the JSON.

If you're unsure whether something is composable, treat it as **NO** and ask.

## What the JSON CAN express today (compose these — JSON only)

- **Canvas** — `width`/`height`, solid `canvas_color`, gradient
  (`canvas_color2` + `canvas_gradient`: none/horizontal/vertical/radial),
  `backgroundUrl` (data URL or remote image), `seat_label_size`,
  `show_seat_labels`.
- **Ticket types (products)** — name, normal + selected colour, per-type seat
  size (`productSizes`). Any number of types (e.g. one product per table).
- **Seats** — absolute position, label, ticket type. Arrange as grids, rows,
  single arcs, or concentric **arc blocks** (curved seating). Per-row / per-zone
  ticket assignment by choosing each seat's product.
- **Zones** — bookable **areas** (polygons) with a colour, ticket type, and
  capacity. A plan can be **zones-only** (no individual seats).
- **Labels** — styled text (font, size, colour, bold/italic, alignment,
  rotation) and auto row labels.
- **Floor elements** — `rect`, `stage`, `line` (straight), `arc` (curved
  demarcation), `circle`, `text`; each with fill/stroke/label/rotation.
- **Multiple plans** per event bundle.

If the request maps onto the above → **JSON only**.

## What needs APPLICATION-CODE changes (gate → ask first)

Examples that the current JSON **cannot** express, so they require code changes
(renderer/model) and therefore the gate above:

- A **new entity / shape** the renderer doesn't know (e.g. per-seat images or
  icons, non-circular seats, heatmaps/overlays, 3D, a "table" object that is one
  bookable unit with N seats, animated effects).
- A **new field** that changes how something is drawn (e.g. per-seat rotation,
  per-zone seat-count grids, curved screens, dashed aisles) that the app does
  not currently read.
- New **booking states / behaviours** beyond what a consumer renders from the
  data (e.g. live availability, pricing logic, hold timers).
- Changing the **export/render pipeline**, validation rules, or schema itself.

Adding any of these = changing the application. **Stop and get permission first.**

## Summary

- Default: **edit the JSON, not the code.**
- Composable from the schema → just do it (data).
- Not composable → **don't change code silently**; say "this changes the
  application code, not the JSON," and ask permission before any `src/**` edit.

# CLAUDE.md

Seat Plan Designer — React + TypeScript + Vite + Konva. Exports/imports a
self-contained plan JSON.

## ⚠️ Operating gate (read first)

When a request is to **create or change a plan/view**, default to editing the
**JSON (the data)** — not the app's source code. Follow `LLM_GUARDRAILS.md`:

- **Composable from the JSON schema → do it in JSON only.** Never touch `src/**`
  to render a view.
- **Not composable** (needs a new entity, render field, or behaviour the app
  doesn't have) → **stop, do not edit code,** tell the user it "changes the
  **application code**, not the JSON," and **ask permission** before any `src/**`
  change.

## Key docs

- `LLM_GUARDRAILS.md` — the JSON-first gate + what is / isn't composable.
- `RENDERING.md` — exact JSON → SVG 1:1 rendering spec (for consumers).
- `AUTHORING.md` — how plans/seats/zones are structured (translate patterns to JSON).
- `README.md` — the app and its features.

## Dev

- `npm run dev` (don't `pkill vite` — it kills the user's running server; use
  `npm run build` or `curl` to verify).
- `npm run build` — type-check + build.
- Headless checks: `scripts/*.ts` (bundle with esbuild → run with node).

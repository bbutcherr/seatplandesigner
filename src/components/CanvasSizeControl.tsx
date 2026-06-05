import { useDesignerStore } from '../store/useDesignerStore'

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: 'Sample 1400×1570', w: 1400, h: 1570 },
  { label: 'Square 1200×1200', w: 1200, h: 1200 },
  { label: 'Landscape 1600×900', w: 1600, h: 900 },
  { label: 'A4 portrait 1240×1754', w: 1240, h: 1754 },
]

/** Floating on-canvas control: exact W×H inputs, size presets, and a
 *  "match background image" button. */
export function CanvasSizeControl({ naturalSize }: { naturalSize?: { w: number; h: number } }) {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const cfg = plan.configuration

  const setW = (v: number) => s.updateConfig({ width: Math.max(100, Math.round(v) || 100) })
  const setH = (v: number) => s.updateConfig({ height: Math.max(100, Math.round(v) || 100) })

  return (
    <div className="canvas-size-control">
      <span className="csc-label">Canvas</span>
      <input
        type="number"
        className="csc-num"
        value={cfg.width}
        min={100}
        onChange={(e) => setW(Number(e.target.value))}
        title="Canvas width (px)"
      />
      <span className="csc-x">×</span>
      <input
        type="number"
        className="csc-num"
        value={cfg.height}
        min={100}
        onChange={(e) => setH(Number(e.target.value))}
        title="Canvas height (px)"
      />
      <select
        className="csc-preset"
        value=""
        onChange={(e) => {
          const p = PRESETS[Number(e.target.value)]
          if (p) s.updateConfig({ width: p.w, height: p.h })
        }}
        title="Size presets"
      >
        <option value="">Presets…</option>
        {PRESETS.map((p, i) => (
          <option key={p.label} value={i}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        className="btn-sm"
        disabled={!naturalSize}
        title={
          naturalSize
            ? `Match background image (${naturalSize.w}×${naturalSize.h})`
            : 'Load a background image first'
        }
        onClick={() => naturalSize && s.updateConfig({ width: naturalSize.w, height: naturalSize.h })}
      >
        Match image
      </button>
    </div>
  )
}

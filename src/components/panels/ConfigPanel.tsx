import { useDesignerStore } from '../../store/useDesignerStore'

export function ConfigPanel() {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const cfg = plan.configuration

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Canvas</h3>
      </div>
      <div className="grid2">
        <label className="field">
          <span>Width</span>
          <input
            type="number"
            value={cfg.width}
            onChange={(e) => s.updateConfig({ width: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Height</span>
          <input
            type="number"
            value={cfg.height}
            onChange={(e) => s.updateConfig({ height: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Seat size (radius)</span>
          <input
            type="number"
            min={1}
            value={cfg.seatRadius}
            onChange={(e) => s.updateConfig({ seatRadius: Math.max(1, Number(e.target.value)) })}
          />
        </label>
        <label className="field">
          <span>Seat text size</span>
          <input
            type="number"
            min={1}
            value={cfg.seatLabelSize}
            onChange={(e) => s.updateConfig({ seatLabelSize: Math.max(1, Number(e.target.value)) })}
          />
        </label>
        <label className="field">
          <span>All seat sizes</span>
          <div className="size-bar">
            <button type="button" title="Make all seats smaller" onClick={() => s.adjustSeatSizes(-1)}>
              −
            </button>
            <span className="size-bar-label">± all</span>
            <button type="button" title="Make all seats bigger" onClick={() => s.adjustSeatSizes(1)}>
              +
            </button>
          </div>
        </label>
        <label className="field">
          <span>{cfg.canvasGradient === 'none' ? 'Canvas color' : 'Canvas color 1'}</span>
          <input
            type="color"
            value={cfg.canvasColor}
            onChange={(e) => s.updateConfig({ canvasColor: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Shade (gradient)</span>
          <select
            value={cfg.canvasGradient}
            onChange={(e) =>
              s.updateConfig({ canvasGradient: e.target.value as typeof cfg.canvasGradient })
            }
          >
            <option value="none">None (solid)</option>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
            <option value="radial">Radial</option>
          </select>
        </label>
        {cfg.canvasGradient !== 'none' && (
          <label className="field">
            <span>Canvas color 2</span>
            <input
              type="color"
              value={cfg.canvasColor2}
              onChange={(e) => s.updateConfig({ canvasColor2: e.target.value })}
            />
          </label>
        )}
        <label className="field check">
          <input
            type="checkbox"
            checked={cfg.showSeatLabels}
            onChange={(e) => s.updateConfig({ showSeatLabels: e.target.checked })}
          />
          <span>Show seat numbers</span>
        </label>
      </div>

      <div className="grid2">
        <label className="field check">
          <input
            type="checkbox"
            checked={cfg.autoZoomEnabled}
            onChange={(e) => s.updateConfig({ autoZoomEnabled: e.target.checked })}
          />
          <span>Auto zoom</span>
        </label>
        <label className="field">
          <span>Zoom level</span>
          <input
            type="number"
            value={cfg.autoZoomLevel}
            onChange={(e) => s.updateConfig({ autoZoomLevel: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Zoom target</span>
          <select
            value={cfg.autoZoomTarget}
            onChange={(e) =>
              s.updateConfig({ autoZoomTarget: e.target.value as typeof cfg.autoZoomTarget })
            }
          >
            <option value="both">both</option>
            <option value="horizontal">horizontal</option>
            <option value="vertical">vertical</option>
          </select>
        </label>
      </div>
    </div>
  )
}

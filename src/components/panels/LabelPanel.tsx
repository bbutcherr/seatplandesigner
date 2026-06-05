import { useState } from 'react'
import { useDesignerStore } from '../../store/useDesignerStore'

export function LabelPanel() {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const [gap, setGap] = useState(16)

  const rowCount = plan.labels.filter((l) => l.row).length
  const clearRowLabels = () =>
    plan.labels.filter((l) => l.row).forEach((l) => s.deleteLabel(l.id))

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Labels</h3>
        <span className="product-count">{plan.labels.length} total</span>
      </div>
      <p className="hint">
        Labels are exported in the JSON (text, color, font, size, style, rotation)
        and rendered into the image. Select one to edit it in Properties.
      </p>

      <button
        className={`btn-block ${s.tool === 'label' ? 'primary' : ''}`}
        onClick={() => s.setTool(s.tool === 'label' ? 'select' : 'label')}
      >
        {s.tool === 'label' ? 'Click canvas to place…' : '+ Add text label'}
      </button>

      <hr />

      <h4 className="sub">Row labels</h4>
      <p className="hint small">
        Auto-place a label at <strong>both ends</strong> of every row, grouped by
        seat-label prefix (A1, A2 → “A”). <em>Edge gap</em> is the clearance past
        the seat edge (so big seats get more room). Re-running replaces them.
      </p>
      <div className="row-buttons">
        <label className="field" style={{ flex: '0 0 90px' }}>
          <span>Edge gap</span>
          <input type="number" value={gap} onChange={(e) => setGap(Number(e.target.value))} />
        </label>
        <button
          className="btn-sm"
          style={{ alignSelf: 'flex-end' }}
          disabled={plan.seats.length === 0}
          onClick={() => s.generateRowLabels(gap)}
        >
          Generate
        </button>
        {rowCount > 0 && (
          <button className="btn-sm" style={{ alignSelf: 'flex-end' }} onClick={clearRowLabels}>
            Clear ({rowCount})
          </button>
        )}
      </div>
    </div>
  )
}

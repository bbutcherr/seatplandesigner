import { useDesignerStore } from '../../store/useDesignerStore'

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function ArcPanel() {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const block = plan.arcBlocks.find((b) => b.id === s.selectedArcId) ?? null

  if (plan.arcBlocks.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Arc blocks</h3>
        </div>
        <p className="hint">
          Create one from <strong>Add seats → Arc</strong>: concentric rows of
          seats. Then select it here (or after creating it) and drag the blue
          radius handle on the canvas to expand all rows together.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Arc blocks</h3>
        <span className="product-count">{plan.arcBlocks.length}</span>
      </div>

      <div className="product-list">
        {plan.arcBlocks.map((b, i) => (
          <div
            key={b.id}
            className={`product-row ${b.id === s.selectedArcId ? 'active' : ''}`}
            onClick={() => s.selectArcBlock(b.id)}
          >
            <div className="product-main">
              <span>
                Arc {i + 1} — {b.rows}×{b.cols}
              </span>
              <span className="product-count">r{Math.round(b.baseRadius)}</span>
            </div>
          </div>
        ))}
      </div>

      {block && (
        <>
          <hr />
          <h4 className="sub">Selected arc</h4>
          <label className="field">
            <span>Base radius (inner row) — drag the canvas handle too</span>
            <input
              type="number"
              value={Math.round(block.baseRadius)}
              onChange={(e) => s.updateArcBlockRadius(block.id, Number(e.target.value))}
            />
          </label>
          <div className="grid2">
            <Num label="Rows" value={block.rows} onChange={(v) => s.regenerateArcBlock(block.id, { rows: Math.max(1, v) })} />
            <Num label="Cols" value={block.cols} onChange={(v) => s.regenerateArcBlock(block.id, { cols: Math.max(1, v) })} />
            <Num label="Row gap" value={block.rowGap} onChange={(v) => s.regenerateArcBlock(block.id, { rowGap: v })} />
            <Num label="Start°" value={block.startAngleDeg} onChange={(v) => s.regenerateArcBlock(block.id, { startAngleDeg: v })} />
            <Num label="End°" value={block.endAngleDeg} onChange={(v) => s.regenerateArcBlock(block.id, { endAngleDeg: v })} />
          </div>
          <p className="hint small">
            Changing rows/cols/gap/angles rebuilds the block's seats. Base radius
            and dragging keep your per-seat edits.
          </p>
          <button className="btn-block" onClick={() => s.deleteArcBlock(block.id)}>
            Delete arc block ({block.rows * block.cols} seats)
          </button>
        </>
      )}
    </div>
  )
}

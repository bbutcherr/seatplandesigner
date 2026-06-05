import { useDesignerStore, type AlignMode } from '../../store/useDesignerStore'

const ALIGN: { mode: AlignMode; label: string; glyph: string }[] = [
  { mode: 'left', label: 'Align left edges', glyph: '⊢' },
  { mode: 'hcenter', label: 'Align horizontal centers', glyph: '↔' },
  { mode: 'right', label: 'Align right edges', glyph: '⊣' },
  { mode: 'top', label: 'Align top edges', glyph: '⊤' },
  { mode: 'vmiddle', label: 'Align vertical centers', glyph: '↕' },
  { mode: 'bottom', label: 'Align bottom edges', glyph: '⊥' },
]

export function AlignPanel() {
  const s = useDesignerStore()
  const ids = s.selectedSeatIds
  const canAlign = ids.length >= 2
  const canDistribute = ids.length >= 3

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Align &amp; distribute</h3>
        <label className="snap-toggle" title="Snap to guides while dragging (hold Alt to bypass)">
          <input
            type="checkbox"
            checked={s.snapEnabled}
            onChange={(e) => s.setSnapEnabled(e.target.checked)}
          />
          <span>Snap</span>
        </label>
      </div>

      {ids.length === 0 ? (
        <p className="hint">Select seats to align them. Drag a seat to see smart guides and equal-spacing marks.</p>
      ) : (
        <>
          <div className="align-grid">
            {ALIGN.map((a) => (
              <button
                key={a.mode}
                className="align-btn"
                title={a.label}
                disabled={!canAlign}
                onClick={() => s.alignSeats(ids, a.mode)}
              >
                {a.glyph}
              </button>
            ))}
          </div>

          <div className="row-buttons">
            <button className="btn-sm" disabled={!canDistribute} onClick={() => s.distributeSeats(ids, 'x')}>
              Distribute H
            </button>
            <button className="btn-sm" disabled={!canDistribute} onClick={() => s.distributeSeats(ids, 'y')}>
              Distribute V
            </button>
          </div>

          <div className="row-buttons">
            <button className="btn-sm" onClick={() => s.centerOnCanvas(ids, 'x')}>
              Center H
            </button>
            <button className="btn-sm" onClick={() => s.centerOnCanvas(ids, 'y')}>
              Center V
            </button>
            <button className="btn-sm" onClick={() => s.centerOnCanvas(ids, 'both')}>
              Center page
            </button>
          </div>
        </>
      )}
    </div>
  )
}

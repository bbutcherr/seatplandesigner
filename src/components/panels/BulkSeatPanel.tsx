import { useState } from 'react'
import { useDesignerStore } from '../../store/useDesignerStore'
import { generateGrid, generateRow } from '../../lib/seatGenerators'
import type { RowLabelMode } from '../../lib/labels'

type Mode = 'grid' | 'row' | 'arc' | 'click'

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function BulkSeatPanel() {
  const s = useDesignerStore()
  const [mode, setMode] = useState<Mode>('grid')

  // shared label config
  const [prefix, setPrefix] = useState('')
  const [rowMode, setRowMode] = useState<RowLabelMode>('alpha')
  const [rowStart, setRowStart] = useState('A')
  const [seatStart, setSeatStart] = useState(1)

  // grid
  const [grid, setGrid] = useState({ rows: 5, cols: 10, startX: 200, startY: 200, xSpacing: 40, ySpacing: 45 })
  // row
  const [row, setRow] = useState({ count: 10, startX: 200, startY: 200, spacing: 40, angleDeg: 0, rowName: 'A' })
  // arc block (rows × cols, concentric)
  const [arc, setArc] = useState({ rows: 4, cols: 12, centerX: 700, centerY: 950, baseRadius: 300, rowGap: 45, startAngleDeg: 210, endAngleDeg: 330 })

  const addGrid = () =>
    s.addSeats(
      generateGrid({ ...grid, prefix, rowMode, rowStart, seatStart }),
    )
  const addRow = () =>
    s.addSeats(
      generateRow({
        count: row.count,
        startX: row.startX,
        startY: row.startY,
        spacing: row.spacing,
        angleDeg: row.angleDeg,
        prefix,
        row: row.rowName,
        seatStart,
      }),
    )
  const addArc = () =>
    s.createArcBlock({
      centerX: arc.centerX,
      centerY: arc.centerY,
      baseRadius: arc.baseRadius,
      rowGap: arc.rowGap,
      rows: arc.rows,
      cols: arc.cols,
      startAngleDeg: arc.startAngleDeg,
      endAngleDeg: arc.endAngleDeg,
      prefix,
      rowStart,
      seatStart,
    })

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Add seats</h3>
      </div>

      <div className="tabs">
        {(['grid', 'row', 'arc', 'click'] as Mode[]).map((m) => (
          <button
            key={m}
            className={`tab ${mode === m ? 'active' : ''}`}
            onClick={() => {
              setMode(m)
              if (m === 'click') s.setTool('seat-click')
              else s.setTool('select')
            }}
          >
            {m === 'grid' ? 'Grid' : m === 'row' ? 'Row' : m === 'arc' ? 'Arc' : 'Click'}
          </button>
        ))}
      </div>

      {mode !== 'click' && (
        <div className="label-config">
          <label className="field">
            <span>Label prefix</span>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="(none)" />
          </label>
          <NumberField label="First seat #" value={seatStart} onChange={setSeatStart} />
        </div>
      )}

      {mode === 'grid' && (
        <>
          <div className="grid2">
            <NumberField label="Rows" value={grid.rows} onChange={(v) => setGrid({ ...grid, rows: v })} />
            <NumberField label="Cols" value={grid.cols} onChange={(v) => setGrid({ ...grid, cols: v })} />
            <NumberField label="Start X" value={grid.startX} onChange={(v) => setGrid({ ...grid, startX: v })} />
            <NumberField label="Start Y" value={grid.startY} onChange={(v) => setGrid({ ...grid, startY: v })} />
            <NumberField label="X gap" value={grid.xSpacing} onChange={(v) => setGrid({ ...grid, xSpacing: v })} />
            <NumberField label="Y gap" value={grid.ySpacing} onChange={(v) => setGrid({ ...grid, ySpacing: v })} />
          </div>
          <label className="field">
            <span>Row labels</span>
            <select value={rowMode} onChange={(e) => setRowMode(e.target.value as RowLabelMode)}>
              <option value="alpha">A, B, C…</option>
              <option value="numeric">1, 2, 3…</option>
            </select>
          </label>
          <label className="field">
            <span>Row start</span>
            <input value={rowStart} onChange={(e) => setRowStart(e.target.value)} />
          </label>
          <button className="btn-block primary" onClick={addGrid}>
            Add {grid.rows * grid.cols} seats
          </button>
        </>
      )}

      {mode === 'row' && (
        <>
          <div className="grid2">
            <NumberField label="Seats" value={row.count} onChange={(v) => setRow({ ...row, count: v })} />
            <label className="field">
              <span>Row name</span>
              <input value={row.rowName} onChange={(e) => setRow({ ...row, rowName: e.target.value })} />
            </label>
            <NumberField label="Start X" value={row.startX} onChange={(v) => setRow({ ...row, startX: v })} />
            <NumberField label="Start Y" value={row.startY} onChange={(v) => setRow({ ...row, startY: v })} />
            <NumberField label="Spacing" value={row.spacing} onChange={(v) => setRow({ ...row, spacing: v })} />
            <NumberField label="Angle°" value={row.angleDeg} onChange={(v) => setRow({ ...row, angleDeg: v })} />
          </div>
          <button className="btn-block primary" onClick={addRow}>
            Add {row.count} seats
          </button>
        </>
      )}

      {mode === 'arc' && (
        <>
          <div className="grid2">
            <NumberField label="Rows" value={arc.rows} onChange={(v) => setArc({ ...arc, rows: v })} />
            <NumberField label="Cols" value={arc.cols} onChange={(v) => setArc({ ...arc, cols: v })} />
            <NumberField label="Center X" value={arc.centerX} onChange={(v) => setArc({ ...arc, centerX: v })} />
            <NumberField label="Center Y" value={arc.centerY} onChange={(v) => setArc({ ...arc, centerY: v })} />
            <NumberField label="Base radius" value={arc.baseRadius} onChange={(v) => setArc({ ...arc, baseRadius: v })} />
            <NumberField label="Row gap" value={arc.rowGap} onChange={(v) => setArc({ ...arc, rowGap: v })} />
            <NumberField label="Start°" value={arc.startAngleDeg} onChange={(v) => setArc({ ...arc, startAngleDeg: v })} />
            <NumberField label="End°" value={arc.endAngleDeg} onChange={(v) => setArc({ ...arc, endAngleDeg: v })} />
          </div>
          <p className="hint">
            Concentric rows: row A is the inner arc at <em>base radius</em>; each
            next row adds <em>row gap</em>. After adding, drag the blue radius
            handle on the canvas to push all rows out together. (0°=right,
            90°=down, 180°=left, 270°=up.)
          </p>
          <button className="btn-block primary" onClick={addArc}>
            Add arc block ({arc.rows * arc.cols} seats)
          </button>
        </>
      )}

      {mode === 'click' && (
        <p className="hint">
          Click-to-place is active. Click anywhere on the canvas to drop a seat
          using the active ticket type. Switch to another tab to stop.
        </p>
      )}
    </div>
  )
}

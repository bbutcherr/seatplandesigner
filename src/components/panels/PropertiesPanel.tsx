import { useDesignerStore } from '../../store/useDesignerStore'

const FONTS = [
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
]

export function PropertiesPanel() {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!

  const zone = plan.zones.find((z) => z.id === s.selectedZoneId)
  if (zone) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Area / zone</h3>
          <button className="btn-sm" onClick={() => s.deleteZone(zone.id)}>
            Delete
          </button>
        </div>
        <label className="field">
          <span>Label</span>
          <input value={zone.label} onChange={(e) => s.updateZone(zone.id, { label: e.target.value })} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Capacity</span>
            <input type="number" min={0} value={zone.capacity} onChange={(e) => s.updateZone(zone.id, { capacity: Math.max(0, Number(e.target.value)) })} />
          </label>
          <label className="field">
            <span>Color</span>
            <input type="color" value={zone.color} onChange={(e) => s.updateZone(zone.id, { color: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Ticket type</span>
          <select value={zone.productId} onChange={(e) => s.updateZone(zone.id, { productId: e.target.value })}>
            {plan.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">A bookable area — one region instead of individual seats. Drag it to move; resize/redraw with the Area tool.</p>
      </div>
    )
  }

  const label = plan.labels.find((l) => l.id === s.selectedLabelId)
  if (label) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>{label.row ? 'Row label' : 'Label'}</h3>
          <button className="btn-sm" onClick={() => s.deleteLabel(label.id)}>
            Delete
          </button>
        </div>
        <label className="field">
          <span>Text</span>
          <input value={label.text} onChange={(e) => s.updateLabel(label.id, { text: e.target.value })} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Font</span>
            <select value={label.fontFamily} onChange={(e) => s.updateLabel(label.id, { fontFamily: e.target.value })}>
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Size</span>
            <input type="number" value={label.fontSize} onChange={(e) => s.updateLabel(label.id, { fontSize: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Color</span>
            <input type="color" value={label.color} onChange={(e) => s.updateLabel(label.id, { color: e.target.value })} />
          </label>
          <label className="field">
            <span>Align</span>
            <select value={label.align} onChange={(e) => s.updateLabel(label.id, { align: e.target.value as 'left' | 'center' | 'right' })}>
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </label>
          <label className="field">
            <span>X</span>
            <input type="number" value={Math.round(label.x)} onChange={(e) => s.updateLabel(label.id, { x: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Y</span>
            <input type="number" value={Math.round(label.y)} onChange={(e) => s.updateLabel(label.id, { y: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Rotation°</span>
            <input type="number" value={Math.round(label.rotation)} onChange={(e) => s.updateLabel(label.id, { rotation: Number(e.target.value) })} />
          </label>
        </div>
        <div className="row-buttons">
          <button className={`btn-sm ${label.bold ? 'primary' : ''}`} onClick={() => s.updateLabel(label.id, { bold: !label.bold })}>
            Bold
          </button>
          <button className={`btn-sm ${label.italic ? 'primary' : ''}`} onClick={() => s.updateLabel(label.id, { italic: !label.italic })}>
            Italic
          </button>
        </div>
      </div>
    )
  }

  const floor = plan.floorElements.find((f) => f.id === s.selectedFloorId)
  if (floor) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Floor element</h3>
          <button className="btn-sm" onClick={() => s.deleteFloorElement(floor.id)}>
            Delete
          </button>
        </div>
        <label className="field">
          <span>Label</span>
          <input
            value={floor.label}
            onChange={(e) => s.updateFloorElement(floor.id, { label: e.target.value })}
          />
        </label>
        <div className="grid2">
          <label className="field">
            <span>X</span>
            <input type="number" value={Math.round(floor.x)} onChange={(e) => s.updateFloorElement(floor.id, { x: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Y</span>
            <input type="number" value={Math.round(floor.y)} onChange={(e) => s.updateFloorElement(floor.id, { y: Number(e.target.value) })} />
          </label>
          {floor.type !== 'text' && (
            <>
              <label className="field">
                <span>Width</span>
                <input type="number" value={Math.round(floor.width)} onChange={(e) => s.updateFloorElement(floor.id, { width: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Height</span>
                <input type="number" value={Math.round(floor.height)} onChange={(e) => s.updateFloorElement(floor.id, { height: Number(e.target.value) })} />
              </label>
            </>
          )}
          <label className="field">
            <span>Rotation°</span>
            <input type="number" value={Math.round(floor.rotation)} onChange={(e) => s.updateFloorElement(floor.id, { rotation: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Font size</span>
            <input type="number" value={floor.fontSize} onChange={(e) => s.updateFloorElement(floor.id, { fontSize: Number(e.target.value) })} />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Fill</span>
            <input type="color" value={floor.fill} onChange={(e) => s.updateFloorElement(floor.id, { fill: e.target.value })} />
          </label>
          <label className="field">
            <span>Stroke</span>
            <input type="color" value={floor.stroke} onChange={(e) => s.updateFloorElement(floor.id, { stroke: e.target.value })} />
          </label>
        </div>
      </div>
    )
  }

  const ids = s.selectedSeatIds
  if (ids.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3>Properties</h3>
        </div>
        <p className="hint">Select seats or a floor element to edit them here.</p>
        {s.clipboard && (
          <button className="btn-block" onClick={() => s.pasteClipboard()}>
            Paste {s.clipboard.seats.length} copied seat
            {s.clipboard.seats.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
    )
  }

  const seats = plan.seats.filter((seat) => ids.includes(seat.id))
  const single = seats.length === 1 ? seats[0] : null

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{single ? `Seat ${single.label}` : `${seats.length} seats`}</h3>
        <div className="row-buttons" style={{ margin: 0 }}>
          <button className="btn-sm" onClick={() => s.copySeats(ids)}>
            Copy
          </button>
          <button className="btn-sm" onClick={() => s.deleteSeats(ids)}>
            Delete
          </button>
        </div>
      </div>

      {s.clipboard && (
        <button className="btn-block" onClick={() => s.pasteClipboard()}>
          Paste {s.clipboard.seats.length} copied seat
          {s.clipboard.seats.length > 1 ? 's' : ''}
        </button>
      )}

      {single ? (
        <div className="grid2">
          <label className="field">
            <span>Label</span>
            <input value={single.label} onChange={(e) => s.updateSeat(single.id, { label: e.target.value })} />
          </label>
          <span />
          <label className="field">
            <span>X</span>
            <input type="number" value={Math.round(single.x)} onChange={(e) => s.updateSeat(single.id, { x: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Y</span>
            <input type="number" value={Math.round(single.y)} onChange={(e) => s.updateSeat(single.id, { y: Number(e.target.value) })} />
          </label>
        </div>
      ) : (
        <p className="hint">
          Drag to move them together, or assign a ticket type from the Ticket
          types panel. Nudge with arrow keys is via dragging on canvas.
        </p>
      )}

      <label className="field">
        <span>Ticket type</span>
        <select
          value={single ? single.productId : ''}
          onChange={(e) => s.assignProductToSeats(ids, e.target.value)}
        >
          {!single && <option value="">— mixed / set type —</option>}
          {plan.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

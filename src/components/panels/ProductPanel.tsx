import { useDesignerStore } from '../../store/useDesignerStore'

export function ProductPanel() {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const counts = plan.seats.reduce<Record<string, number>>((m, seat) => {
    m[seat.productId] = (m[seat.productId] ?? 0) + 1
    return m
  }, {})

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Ticket types</h3>
        <button className="btn-sm" onClick={() => s.addProduct()}>
          + Add
        </button>
      </div>
      <p className="hint">
        Click a type to make it active — new seats and the “apply to selection”
        button use it. Two colors per type: normal and selected/booked.
      </p>

      <div className="product-list">
        {plan.products.map((p) => {
          const active = p.id === s.activeProductId
          return (
            <div
              key={p.id}
              className={`product-row ${active ? 'active' : ''}`}
              onClick={() => s.setActiveProduct(p.id)}
            >
              <div className="product-main">
                <input
                  className="product-name"
                  value={p.name}
                  onChange={(e) => s.updateProduct(p.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="product-count">{counts[p.id] ?? 0} seats</span>
              </div>
              <div className="swatches" onClick={(e) => e.stopPropagation()}>
                <label title="Seat size (radius) for this type">
                  <span>⌀</span>
                  <input
                    type="number"
                    className="product-size"
                    min={1}
                    value={p.radius}
                    onChange={(e) =>
                      s.updateProduct(p.id, { radius: Math.max(1, Number(e.target.value)) })
                    }
                  />
                </label>
                <label title="Normal color">
                  <span>N</span>
                  <input
                    type="color"
                    value={p.color}
                    onChange={(e) => s.updateProduct(p.id, { color: e.target.value })}
                  />
                </label>
                <label title="Selected / booked color">
                  <span>S</span>
                  <input
                    type="color"
                    value={p.selectedColor}
                    onChange={(e) =>
                      s.updateProduct(p.id, { selectedColor: e.target.value })
                    }
                  />
                </label>
                <button
                  className="btn-icon"
                  title="Delete type"
                  disabled={plan.products.length <= 1}
                  onClick={() => s.deleteProduct(p.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {s.selectedSeatIds.length > 0 && (
        <button
          className="btn-block"
          onClick={() => s.assignProductToSeats(s.selectedSeatIds, s.activeProductId)}
        >
          Apply active type to {s.selectedSeatIds.length} selected seat
          {s.selectedSeatIds.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

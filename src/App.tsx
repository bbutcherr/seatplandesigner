import { useRef, useState } from 'react'
import type Konva from 'konva'
import { DesignCanvas, type CanvasApi } from './components/DesignCanvas'
import { PreviewPane } from './components/PreviewPane'
import { TopBar } from './components/panels/TopBar'
import { Toolbar } from './components/panels/Toolbar'
import { ConfigPanel } from './components/panels/ConfigPanel'
import { ProductPanel } from './components/panels/ProductPanel'
import { BulkSeatPanel } from './components/panels/BulkSeatPanel'
import { FloorPanel } from './components/panels/FloorPanel'
import { PropertiesPanel } from './components/panels/PropertiesPanel'
import { AlignPanel } from './components/panels/AlignPanel'
import { LabelPanel } from './components/panels/LabelPanel'
import { ArcPanel } from './components/panels/ArcPanel'
import { useDesignerStore } from './store/useDesignerStore'
import { planSeatsMissingProduct } from './lib/validate'

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null)
  const apiRef = useRef<CanvasApi | null>(null)
  const [preview, setPreview] = useState(false)
  const plan = useDesignerStore((s) => s.project.plans.find((p) => p.id === s.project.activePlanId)!)

  return (
    <div className="app">
      <TopBar previewOpen={preview} onTogglePreview={() => setPreview((v) => !v)} />
      <div className="body">
        <Toolbar />
        <main className="stage-area">
          <DesignCanvas stageRef={stageRef} apiRef={apiRef} />
          {preview && <PreviewPane onClose={() => setPreview(false)} />}
          <div className="stat-bar">
            {plan.seats.length} seats · {plan.products.length} ticket types ·{' '}
            {plan.floorElements.length} floor elements
            {(() => {
              const missing = planSeatsMissingProduct(plan).length
              return missing > 0 ? (
                <span className="stat-warn">
                  {' '}· ⚠ {missing} seat{missing > 1 ? 's' : ''} without a ticket type
                </span>
              ) : null
            })()}
          </div>
        </main>
        <aside className="sidebar">
          <PropertiesPanel />
          <AlignPanel />
          <BulkSeatPanel />
          <ArcPanel />
          <ProductPanel />
          <LabelPanel />
          <FloorPanel apiRef={apiRef} />
          <ConfigPanel />
        </aside>
      </div>
    </div>
  )
}

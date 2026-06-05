import { useRef } from 'react'
import { useDesignerStore, type Tool } from '../../store/useDesignerStore'
import type { CanvasApi } from '../DesignCanvas'
import { urlToDataUrl } from '../../lib/raster'

const FLOOR_TOOLS: { tool: Tool; label: string }[] = [
  { tool: 'floor-rect', label: 'Block' },
  { tool: 'floor-stage', label: 'Stage' },
  { tool: 'floor-line', label: 'Wall / line' },
  { tool: 'floor-circle', label: 'Circle' },
  { tool: 'floor-text', label: 'Text label' },
]

// Allowed background image formats.
const ACCEPT_IMAGE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i

export function FloorPanel({ apiRef }: { apiRef: React.MutableRefObject<CanvasApi | null> }) {
  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const cfg = plan.configuration
  const fileRef = useRef<HTMLInputElement>(null)

  const onUpload = (file: File) => {
    const okType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.test(file.name)
    if (!okType) {
      alert('Unsupported image type. Please use a JPEG, JPG, PNG, or WebP file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => s.updateConfig({ backgroundUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  const rasterize = () => {
    const url = apiRef.current?.rasterizeFloor()
    if (url) s.updateConfig({ backgroundUrl: url })
  }

  const isRemote = /^https?:\/\//i.test(cfg.backgroundUrl)
  const embedRemote = async () => {
    try {
      const dataUrl = await urlToDataUrl(cfg.backgroundUrl)
      s.updateConfig({ backgroundUrl: dataUrl })
    } catch {
      alert(
        'Could not embed this image (the remote server may block cross-origin access). ' +
          'Download it and use “Upload image…” instead.',
      )
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Background &amp; floor plan</h3>
      </div>

      <label className="field">
        <span>Background image URL</span>
        <input
          value={cfg.backgroundUrl.startsWith('data:') ? '(embedded image)' : cfg.backgroundUrl}
          readOnly={cfg.backgroundUrl.startsWith('data:')}
          placeholder="https://…  (goes into the JSON)"
          onChange={(e) => s.updateConfig({ backgroundUrl: e.target.value })}
        />
      </label>
      <div className="row-buttons">
        <button className="btn-sm" onClick={() => fileRef.current?.click()}>
          Upload image…
        </button>
        {isRemote && (
          <button className="btn-sm" onClick={embedRemote} title="Convert the remote image to an embedded data URL so the JSON is self-contained">
            Embed in JSON
          </button>
        )}
        {cfg.backgroundUrl && (
          <button className="btn-sm" onClick={() => s.updateConfig({ backgroundUrl: '' })}>
            Clear
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_IMAGE}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      <hr />

      <p className="hint">
        No image? Build a floor plan: pick an element, then drag on the canvas to
        draw it. Select an element to edit or label it in Properties.
      </p>
      <div className="tool-grid">
        {FLOOR_TOOLS.map((t) => (
          <button
            key={t.tool}
            className={`tool-btn ${s.tool === t.tool ? 'active' : ''}`}
            onClick={() => s.setTool(s.tool === t.tool ? 'select' : t.tool)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        className="btn-block"
        disabled={plan.floorElements.length === 0}
        onClick={rasterize}
        title="Render the floor elements into the background image used by the JSON"
      >
        Bake floor → background image
      </button>
      <p className="hint small">
        {plan.floorElements.length} floor element
        {plan.floorElements.length === 1 ? '' : 's'}. Baking flattens them into an
        embedded PNG background so the exported plan keeps the layout.
      </p>
    </div>
  )
}

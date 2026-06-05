import { useEffect, useMemo, useState } from 'react'
import { useDesignerStore } from '../store/useDesignerStore'
import { planToExported } from '../lib/exportJson'
import { planToImageBlob } from '../lib/raster'
import { copyToClipboard } from '../lib/clipboard'

export function PreviewPane({ onClose }: { onClose: () => void }) {
  const plan = useDesignerStore((s) => s.project.plans.find((p) => p.id === s.project.activePlanId)!)
  const [tab, setTab] = useState<'json' | 'image'>('json')
  const [imgUrl, setImgUrl] = useState<string>('')
  const [imgError, setImgError] = useState(false)

  // Pure exported JSON for this plan (sample schema).
  const jsonText = useMemo(() => JSON.stringify(planToExported(plan), null, 2), [plan])

  // Re-render the WebP whenever the plan changes while the Image tab is open.
  useEffect(() => {
    if (tab !== 'image') return
    let cancelled = false
    let url = ''
    setImgError(false)
    planToImageBlob(plan, 'image/webp')
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImgUrl(url)
      })
      .catch(() => !cancelled && setImgError(true))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [plan, tab])

  const copyJson = () => copyToClipboard(jsonText)

  return (
    <section className="preview">
      <div className="preview-head">
        <div className="tabs preview-tabs">
          <button className={`tab ${tab === 'json' ? 'active' : ''}`} onClick={() => setTab('json')}>
            JSON
          </button>
          <button className={`tab ${tab === 'image' ? 'active' : ''}`} onClick={() => setTab('image')}>
            Image
          </button>
        </div>
        <span className="preview-title">
          Live preview · {plan.name} · {plan.seats.length} seats
        </span>
        <div className="preview-actions">
          {tab === 'json' && (
            <button className="btn-sm" onClick={copyJson}>
              Copy JSON
            </button>
          )}
          <button className="btn-sm" onClick={onClose}>
            Close ✕
          </button>
        </div>
      </div>

      <div className="preview-body">
        {tab === 'json' ? (
          <pre className="preview-json">{jsonText}</pre>
        ) : (
          <div className="preview-svg">
            {imgError ? (
              <p className="hint">
                Could not render the image. A remote background image URL may be
                blocked by CORS — upload the image instead.
              </p>
            ) : imgUrl ? (
              <img src={imgUrl} alt={`${plan.name} preview`} />
            ) : (
              <p className="hint">Rendering…</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

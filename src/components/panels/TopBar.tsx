import { useRef, useState } from 'react'
import { useDesignerStore } from '../../store/useDesignerStore'
import { bundleToJson, downloadJson, projectToBundle } from '../../lib/exportJson'
import { downloadPlanImage } from '../../lib/raster'
import { validateProjectForExport } from '../../lib/validate'
import { bundleToProject } from '../../lib/importJson'
import { copyToClipboard } from '../../lib/clipboard'
import { buildExamplePlan } from '../../lib/sampleProject'

export function TopBar({
  previewOpen,
  onTogglePreview,
}: {
  previewOpen: boolean
  onTogglePreview: () => void
}) {
  const s = useDesignerStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const safeName = () =>
    s.project.sourceEvent.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'seating-plans'

  // Validate before producing JSON; on failure, select the offending seats and
  // explain. Returns true when the project is safe to export/copy.
  const passesValidation = (): boolean => {
    const v = validateProjectForExport(s.project)
    if (v.ok) return true
    const first = v.issues[0]
    if (first.planId !== s.project.activePlanId) s.setActivePlan(first.planId)
    s.setSelectedSeats(first.seats.map((x) => x.id))
    const lines = v.issues.map((pi) => {
      const labels = pi.seats.slice(0, 8).map((x) => x.label || '(unlabeled)').join(', ')
      return `• ${pi.planName}: ${pi.seats.length} seat${pi.seats.length > 1 ? 's' : ''} — ${labels}${pi.seats.length > 8 ? '…' : ''}`
    })
    alert(
      `Cannot export — every seat must have a ticket type assigned.\n\n` +
        `${v.total} seat${v.total > 1 ? 's' : ''} without a ticket type:\n${lines.join('\n')}\n\n` +
        `The affected seats in "${first.planName}" are now selected — assign a ticket type (Ticket types panel) and try again.`,
    )
    return false
  }

  const onExport = () => {
    if (!passesValidation()) return
    downloadJson(projectToBundle(s.project, new Date()), `${safeName()}.json`)
  }

  const onCopyJson = async () => {
    if (!passesValidation()) return
    const text = bundleToJson(projectToBundle(s.project, new Date()))
    const ok = await copyToClipboard(text)
    setCopyState(ok ? 'ok' : 'fail')
    setTimeout(() => setCopyState('idle'), 1600)
  }

  const onExportImage = async () => {
    const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
    const slug = plan.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'plan'
    try {
      await downloadPlanImage(plan, `${safeName()}-${slug}.webp`, 'image/webp')
    } catch {
      alert(
        'Could not render the image. If the plan uses a remote background image URL, upload the image instead (remote URLs can be blocked by CORS).',
      )
    }
  }

  // Drop in a fully-built example as a NEW plan (keeps existing plans).
  const onExample = () => {
    const plan = buildExamplePlan()
    s.loadProject({
      ...s.project,
      plans: [...s.project.plans, plan],
      activePlanId: plan.id,
    })
  }

  const onImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const bundle = JSON.parse(String(reader.result))
        s.loadProject(bundleToProject(bundle))
      } catch (err) {
        alert('Could not import file: ' + (err as Error).message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="topbar">
      <div className="brand">Seat Plan Designer</div>

      <label className="field inline">
        <span>Event</span>
        <input
          value={s.project.sourceEvent}
          onChange={(e) => s.setSourceEvent(e.target.value)}
        />
      </label>

      <div className="plan-tabs">
        {s.project.plans.map((p) => (
          <div
            key={p.id}
            className={`plan-tab ${p.id === s.project.activePlanId ? 'active' : ''}`}
            onClick={() => s.setActivePlan(p.id)}
          >
            <input
              className="plan-name"
              value={p.name}
              onChange={(e) => s.renamePlan(p.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {s.project.plans.length > 1 && (
              <button
                className="plan-close"
                onClick={(e) => {
                  e.stopPropagation()
                  s.deletePlan(p.id)
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="btn-sm" onClick={() => s.addPlan()}>
          + Plan
        </button>
        <button className="btn-sm" onClick={() => s.duplicateActivePlan()}>
          Duplicate
        </button>
        <button className="btn-sm" onClick={onExample} title="Add a fully-built example auditorium as a new plan, then adjust it with the tools">
          ✨ Example
        </button>
      </div>

      <div className="topbar-actions">
        <button className={`btn-sm ${previewOpen ? 'primary' : ''}`} onClick={onTogglePreview}>
          Preview
        </button>
        <button className="btn-sm" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <button className="btn-sm" onClick={onExportImage}>
          Export WebP
        </button>
        <button className="btn-sm" onClick={onCopyJson}>
          {copyState === 'ok' ? 'Copied ✓' : copyState === 'fail' ? 'Copy failed' : 'Copy JSON'}
        </button>
        <button className="btn primary" onClick={onExport}>
          Export JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportFile(f)
            e.target.value = ''
          }}
        />
      </div>
    </header>
  )
}

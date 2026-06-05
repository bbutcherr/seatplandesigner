import { useDesignerStore, type Tool } from '../../store/useDesignerStore'

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select / move', icon: '⬚' },
  { tool: 'seat-click', label: 'Place seat', icon: '◉' },
  { tool: 'label', label: 'Place label (exported)', icon: 'T' },
  { tool: 'floor-rect', label: 'Block', icon: '▭' },
  { tool: 'floor-stage', label: 'Stage', icon: '▬' },
  { tool: 'floor-line', label: 'Wall', icon: '╱' },
  { tool: 'floor-circle', label: 'Circle', icon: '◯' },
  { tool: 'floor-text', label: 'Floor text (baked)', icon: 'T̲' },
]

export function Toolbar() {
  const tool = useDesignerStore((s) => s.tool)
  const setTool = useDesignerStore((s) => s.setTool)
  return (
    <nav className="toolrail">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          title={t.label}
          className={`rail-btn ${tool === t.tool ? 'active' : ''}`}
          onClick={() => setTool(t.tool)}
        >
          <span className="rail-icon">{t.icon}</span>
        </button>
      ))}
    </nav>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Arc, Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useDesignerStore } from '../store/useDesignerStore'
import type { ArcBlock, FloorElement, Label } from '../types'
import { useImage } from './useImage'
import { boxOf, computeSnap, type DistMark, type Guide } from '../lib/snapping'
import { computeCanvasSize, type ResizeEdge } from '../lib/canvasResize'
import { konvaBgFill } from '../lib/gradient'
import { CanvasSizeControl } from './CanvasSizeControl'

interface Pt { x: number; y: number }

type Interaction =
  | { mode: 'none' }
  | { mode: 'pan'; startScreen: Pt; startPos: Pt }
  | { mode: 'move'; startWorld: Pt; originals: Map<string, Pt> }
  | { mode: 'move-floor'; id: string; startWorld: Pt; orig: { x: number; y: number; w: number; h: number } }
  | { mode: 'marquee'; start: Pt; additive: boolean }
  | { mode: 'draw'; start: Pt }
  | { mode: 'resize-canvas'; edge: ResizeEdge; startW: number; startH: number }
  | { mode: 'move-label'; id: string; startWorld: Pt; orig: Pt }
  | { mode: 'arc-radius'; id: string }
  | { mode: 'arc-center'; id: string; last: Pt }

export interface CanvasApi {
  rasterizeFloor: () => string | null
  fit: () => void
}

export function DesignCanvas({
  stageRef,
  apiRef,
}: {
  stageRef: React.MutableRefObject<Konva.Stage | null>
  apiRef?: React.MutableRefObject<CanvasApi | null>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState<Pt>({ x: 40, y: 40 })
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [draw, setDraw] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [smart, setSmart] = useState<{ guides: Guide[]; dists: DistMark[] }>({ guides: [], dists: [] })
  const [resize, setResize] = useState<{ w: number; h: number; sx: number; sy: number; edge: ResizeEdge } | null>(null)
  const [grabbing, setGrabbing] = useState(false)
  const [space, setSpace] = useState(false)
  const interaction = useRef<Interaction>({ mode: 'none' })

  const s = useDesignerStore()
  const plan = s.project.plans.find((p) => p.id === s.project.activePlanId)!
  const cfg = plan.configuration
  const productById = useMemo(
    () => new Map(plan.products.map((p) => [p.id, p])),
    [plan.products],
  )
  const selected = useMemo(() => new Set(s.selectedSeatIds), [s.selectedSeatIds])
  const bgImage = useImage(cfg.backgroundUrl || undefined)

  // Bounding box around a multi-seat selection — a grab area so the whole
  // group can be dragged from anywhere inside it (not only by hitting a seat).
  const selBounds = useMemo(() => {
    if (s.selectedSeatIds.length < 2) return null
    const sel = plan.seats.filter((seat) => selected.has(seat.id))
    if (sel.length < 2) return null
    const pad = cfg.seatRadius + 6
    const xs = sel.map((p) => p.x)
    const ys = sel.map((p) => p.y)
    const minX = Math.min(...xs) - pad
    const minY = Math.min(...ys) - pad
    return { x: minX, y: minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY }
  }, [s.selectedSeatIds, plan.seats, selected, cfg.seatRadius])

  const arcBlock = useMemo(
    () => plan.arcBlocks.find((b) => b.id === s.selectedArcId) ?? null,
    [plan.arcBlocks, s.selectedArcId],
  )

  // Resize observer to keep the stage filling its container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Spacebar = temporary pan mode.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e)) {
        e.preventDefault()
        setSpace(true)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping(e)) {
        if (s.selectedSeatIds.length) {
          e.preventDefault()
          s.deleteSeats(s.selectedSeatIds)
        } else if (s.selectedFloorId) {
          e.preventDefault()
          s.deleteFloorElement(s.selectedFloorId)
        } else if (s.selectedLabelId) {
          e.preventDefault()
          s.deleteLabel(s.selectedLabelId)
        }
      }
      const mod = e.ctrlKey || e.metaKey
      if (mod && !isTyping(e)) {
        const k = e.key.toLowerCase()
        if (k === 'c' && s.selectedSeatIds.length) {
          e.preventDefault()
          s.copySeats(s.selectedSeatIds)
        } else if (k === 'v' && s.clipboard) {
          e.preventDefault()
          s.pasteClipboard()
        } else if (k === 'd' && s.selectedSeatIds.length) {
          // Ctrl/Cmd+D = copy + immediate paste (duplicate in place + offset)
          e.preventDefault()
          s.copySeats(s.selectedSeatIds)
          s.pasteClipboard()
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [s])

  const toWorld = (screen: Pt): Pt => ({
    x: (screen.x - pos.x) / scale,
    y: (screen.y - pos.y) / scale,
  })

  const pointer = (e: KonvaEventObject<unknown>): Pt => {
    const p = e.target.getStage()!.getPointerPosition()!
    return { x: p.x, y: p.y }
  }

  const fit = () => {
    const pad = 40
    const sx = (size.w - pad * 2) / cfg.width
    const sy = (size.h - pad * 2) / cfg.height
    const ns = Math.min(sx, sy)
    setScale(ns)
    setPos({
      x: (size.w - cfg.width * ns) / 2,
      y: (size.h - cfg.height * ns) / 2,
    })
  }

  // Rasterize the page + floor layers (excluding seats) into a PNG data URL
  // sized to the configured canvas, for use as a background image.
  const rasterizeFloor = (): string | null => {
    const stage = stageRef.current
    if (!stage) return null
    const layers = stage.getLayers()
    const seatsLayer = layers[2]
    const overlay = layers[3]
    seatsLayer?.hide()
    overlay?.hide()
    const url = stage.toDataURL({
      x: pos.x,
      y: pos.y,
      width: cfg.width * scale,
      height: cfg.height * scale,
      pixelRatio: 1 / scale,
    })
    seatsLayer?.show()
    overlay?.show()
    return url
  }

  useEffect(() => {
    if (apiRef) apiRef.current = { rasterizeFloor, fit }
  })

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const old = scale
    const ptr = pointer(e)
    const worldBefore = { x: (ptr.x - pos.x) / old, y: (ptr.y - pos.y) / old }
    const factor = e.evt.deltaY > 0 ? 0.9 : 1.1
    const ns = Math.min(8, Math.max(0.05, old * factor))
    setScale(ns)
    setPos({ x: ptr.x - worldBefore.x * ns, y: ptr.y - worldBefore.y * ns })
  }

  const nextSeatLabel = () => `S${plan.seats.length + 1}`

  // Begin dragging a set of seats: snapshot their positions and flag grabbing.
  const beginSeatMove = (ids: string[], world: Pt) => {
    const originals = new Map<string, Pt>()
    plan.seats.forEach((seat) => {
      if (ids.includes(seat.id)) originals.set(seat.id, { x: seat.x, y: seat.y })
    })
    interaction.current = { mode: 'move', startWorld: world, originals }
    setGrabbing(true)
  }

  const onMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const scr = pointer(e)
    const world = toWorld(scr)
    const middle = e.evt.button === 1

    if (space || middle) {
      interaction.current = { mode: 'pan', startScreen: scr, startPos: { ...pos } }
      return
    }

    const t = e.target
    const name = t.name()

    if (name.startsWith('handle-')) {
      const edge = name.slice('handle-'.length) as ResizeEdge
      interaction.current = { mode: 'resize-canvas', edge, startW: cfg.width, startH: cfg.height }
      setResize({ w: cfg.width, h: cfg.height, sx: scr.x, sy: scr.y, edge })
      return
    }
    if (name === 'arc-center' && arcBlock) {
      interaction.current = { mode: 'arc-center', id: arcBlock.id, last: world }
      return
    }
    if (name === 'arc-radius' && arcBlock) {
      interaction.current = { mode: 'arc-radius', id: arcBlock.id }
      return
    }

    if (s.tool === 'select') {
      if (name === 'seat') {
        const id = t.id()
        if (e.evt.shiftKey) {
          // shift-click is selection only, not a drag
          s.toggleSeat(id, true)
          interaction.current = { mode: 'none' }
          return
        }
        let ids = s.selectedSeatIds
        if (!ids.includes(id)) {
          s.setSelectedSeats([id])
          ids = [id]
        }
        beginSeatMove(ids, world)
      } else if (name === 'selbounds') {
        // grab the whole multi-selection from inside its bounding box
        beginSeatMove(s.selectedSeatIds, world)
      } else if (name === 'floor') {
        const id = t.id()
        s.selectFloor(id)
        const el = plan.floorElements.find((f) => f.id === id)
        if (el) {
          interaction.current = {
            mode: 'move-floor',
            id,
            startWorld: world,
            orig: { x: el.x, y: el.y, w: el.width, h: el.height },
          }
        } else {
          interaction.current = { mode: 'none' }
        }
      } else if (name === 'label') {
        const id = t.id()
        s.selectLabel(id)
        const lbl = plan.labels.find((l) => l.id === id)
        if (lbl) {
          interaction.current = { mode: 'move-label', id, startWorld: world, orig: { x: lbl.x, y: lbl.y } }
        } else {
          interaction.current = { mode: 'none' }
        }
      } else {
        if (!e.evt.shiftKey) s.clearSelection()
        interaction.current = { mode: 'marquee', start: world, additive: e.evt.shiftKey }
        setMarquee({ x: world.x, y: world.y, w: 0, h: 0 })
      }
    } else if (s.tool === 'seat-click') {
      s.addSeats([{ label: nextSeatLabel(), x: Math.round(world.x), y: Math.round(world.y) }])
    } else if (s.tool === 'label') {
      s.addLabel({ text: 'Label', x: Math.round(world.x), y: Math.round(world.y) })
      s.setTool('select')
    } else if (s.tool.startsWith('floor-')) {
      interaction.current = { mode: 'draw', start: world }
      setDraw({ x: world.x, y: world.y, w: 0, h: 0 })
    }
  }

  const onMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const it = interaction.current
    if (it.mode === 'none') return
    const scr = pointer(e)
    const world = toWorld(scr)

    if (it.mode === 'pan') {
      setPos({
        x: it.startPos.x + (scr.x - it.startScreen.x),
        y: it.startPos.y + (scr.y - it.startScreen.y),
      })
    } else if (it.mode === 'resize-canvas') {
      const { width, height } = computeCanvasSize(it.edge, world.x, world.y, {
        startW: it.startW,
        startH: it.startH,
        keepAspect: e.evt.shiftKey,
        snap: e.evt.altKey ? 1 : 10,
        min: 100,
      })
      s.updateConfig({ width, height })
      setResize({ w: width, h: height, sx: scr.x, sy: scr.y, edge: it.edge })
    } else if (it.mode === 'arc-center') {
      s.moveArcBlock(it.id, world.x - it.last.x, world.y - it.last.y)
      it.last = world
    } else if (it.mode === 'arc-radius') {
      const b = plan.arcBlocks.find((bb) => bb.id === it.id)
      if (b) {
        const dist = Math.hypot(world.x - b.centerX, world.y - b.centerY)
        s.updateArcBlockRadius(it.id, dist - (b.rows - 1) * b.rowGap)
      }
    } else if (it.mode === 'move') {
      const raw = { x: world.x - it.startWorld.x, y: world.y - it.startWorld.y }
      const ids = Array.from(it.originals.keys())
      const proposed = ids.map((id) => {
        const o = it.originals.get(id)!
        return { x: o.x + raw.x, y: o.y + raw.y }
      })
      let sdx = 0
      let sdy = 0
      let guides: Guide[] = []
      let dists: DistMark[] = []
      // Alt temporarily disables snapping (Figma convention).
      if (s.snapEnabled && !e.evt.altKey) {
        const others = plan.seats
          .filter((seat) => !it.originals.has(seat.id))
          .map((seat) => ({ x: seat.x, y: seat.y }))
        const res = computeSnap(boxOf(proposed), others, {
          threshold: 7 / scale,
          neighborTol: cfg.seatRadius * 3,
          canvasW: cfg.width,
          canvasH: cfg.height,
        })
        sdx = res.dx
        sdy = res.dy
        guides = res.guides
        dists = res.dists
      }
      s.setSeatPositions(
        ids.map((id) => {
          const o = it.originals.get(id)!
          return { id, x: o.x + raw.x + sdx, y: o.y + raw.y + sdy }
        }),
      )
      setSmart({ guides, dists })
    } else if (it.mode === 'move-floor') {
      const raw = { x: world.x - it.startWorld.x, y: world.y - it.startWorld.y }
      const nx = it.orig.x + raw.x
      const ny = it.orig.y + raw.y
      let sdx = 0
      let sdy = 0
      let guides: Guide[] = []
      let dists: DistMark[] = []
      if (s.snapEnabled && !e.evt.altKey) {
        const box = {
          minX: nx,
          maxX: nx + it.orig.w,
          minY: ny,
          maxY: ny + it.orig.h,
          cx: nx + it.orig.w / 2,
          cy: ny + it.orig.h / 2,
        }
        // Align floor elements to each other (centers) and to the page center.
        const others = plan.floorElements
          .filter((f) => f.id !== it.id)
          .map((f) => ({ x: f.x + f.width / 2, y: f.y + f.height / 2 }))
        const res = computeSnap(box, others, {
          threshold: 7 / scale,
          neighborTol: Math.max(it.orig.w, it.orig.h) / 2 + 20,
          canvasW: cfg.width,
          canvasH: cfg.height,
        })
        sdx = res.dx
        sdy = res.dy
        guides = res.guides
        dists = res.dists
      }
      s.updateFloorElement(it.id, { x: Math.round(nx + sdx), y: Math.round(ny + sdy) })
      setSmart({ guides, dists })
    } else if (it.mode === 'move-label') {
      s.updateLabel(it.id, {
        x: Math.round(it.orig.x + (world.x - it.startWorld.x)),
        y: Math.round(it.orig.y + (world.y - it.startWorld.y)),
      })
    } else if (it.mode === 'marquee') {
      setMarquee({
        x: Math.min(it.start.x, world.x),
        y: Math.min(it.start.y, world.y),
        w: Math.abs(world.x - it.start.x),
        h: Math.abs(world.y - it.start.y),
      })
    } else if (it.mode === 'draw') {
      setDraw({
        x: Math.min(it.start.x, world.x),
        y: Math.min(it.start.y, world.y),
        w: Math.abs(world.x - it.start.x),
        h: Math.abs(world.y - it.start.y),
      })
    }
  }

  const onMouseUp = () => {
    const it = interaction.current
    if (it.mode === 'marquee' && marquee) {
      const hits = plan.seats
        .filter(
          (seat) =>
            seat.x >= marquee.x &&
            seat.x <= marquee.x + marquee.w &&
            seat.y >= marquee.y &&
            seat.y <= marquee.y + marquee.h,
        )
        .map((seat) => seat.id)
      if (it.additive) {
        s.setSelectedSeats(Array.from(new Set([...s.selectedSeatIds, ...hits])))
      } else {
        s.setSelectedSeats(hits)
      }
      setMarquee(null)
    } else if (it.mode === 'draw' && draw) {
      finalizeFloorDraw(draw)
      setDraw(null)
    }
    if (smart.guides.length || smart.dists.length) setSmart({ guides: [], dists: [] })
    if (resize) setResize(null)
    if (grabbing) setGrabbing(false)
    interaction.current = { mode: 'none' }
  }

  const finalizeFloorDraw = (r: { x: number; y: number; w: number; h: number }) => {
    const tool = s.tool
    const base = {
      x: Math.round(r.x),
      y: Math.round(r.y),
      rotation: 0,
      fill: '#e2e8f0',
      stroke: '#64748b',
      strokeWidth: 2,
      fontSize: 18,
    }
    if (tool === 'floor-text') {
      s.addFloorElement({ ...base, type: 'text', width: 120, height: 24, label: 'Label', fill: '#0f172a' })
      return
    }
    const w = Math.max(20, Math.round(r.w))
    const h = Math.max(20, Math.round(r.h))
    if (tool === 'floor-rect') {
      s.addFloorElement({ ...base, type: 'rect', width: w, height: h, label: '' })
    } else if (tool === 'floor-stage') {
      s.addFloorElement({ ...base, type: 'stage', width: w, height: h, label: 'STAGE', fill: '#1e293b' })
    } else if (tool === 'floor-circle') {
      s.addFloorElement({ ...base, type: 'circle', width: w, height: h, label: '' })
    } else if (tool === 'floor-line') {
      s.addFloorElement({
        ...base,
        type: 'line',
        width: w,
        height: h,
        label: '',
        points: [0, 0, w, h],
      })
    }
  }

  const cursor = resize
    ? edgeCursor(resize.edge)
    : grabbing
      ? 'move'
      : space || interaction.current.mode === 'pan'
        ? 'grab'
        : s.tool === 'select'
          ? 'default'
          : 'crosshair'

  // Seat numbers are drawn at a constant on-screen size (seatLabelSize px) so
  // they stay readable at any zoom; shown per-seat when the seat is big enough
  // on screen to fit a number (see the per-seat check below).
  const labelScreenFs = cfg.seatLabelSize / scale

  return (
    <div ref={containerRef} className="canvas-host" style={{ cursor }}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {/* Page + background */}
        <Layer>
          <Rect x={0} y={0} width={cfg.width} height={cfg.height} {...konvaBgFill(cfg)} stroke="#cbd5e1" strokeWidth={1 / scale} name="background" />
          {bgImage && (
            <KonvaImage image={bgImage} x={0} y={0} width={cfg.width} height={cfg.height} name="background" listening={false} />
          )}
        </Layer>

        {/* Floor elements */}
        <Layer>
          {plan.floorElements.map((el) => (
            <FloorShape key={el.id} el={el} selected={s.selectedFloorId === el.id} />
          ))}
        </Layer>

        {/* Seats */}
        <Layer>
          {selBounds && s.tool === 'select' && (
            <Rect
              name="selbounds"
              x={selBounds.x}
              y={selBounds.y}
              width={selBounds.w}
              height={selBounds.h}
              fill="#0ea5e9"
              opacity={0.07}
              stroke="#0ea5e9"
              strokeWidth={1 / scale}
              dash={[6 / scale, 4 / scale]}
              onMouseEnter={(ev) => setContainerCursor(ev, 'move')}
              onMouseLeave={(ev) => setContainerCursor(ev, '')}
            />
          )}
          {plan.seats.map((seat) => {
            const product = productById.get(seat.productId)
            const isSel = selected.has(seat.id)
            const fill = isSel ? product?.selectedColor ?? '#888' : product?.color ?? '#888'
            const r = product?.radius ?? cfg.seatRadius
            // Show the number once the seat is at least ~4px on screen
            // (below that, seats are too small/dense for readable numbers).
            const showThis = cfg.showSeatLabels && r * scale > 4
            const halfW = 60 / scale
            return (
              <Group key={seat.id}>
                <Circle
                  name="seat"
                  id={seat.id}
                  x={seat.x}
                  y={seat.y}
                  radius={r}
                  fill={fill}
                  stroke={isSel ? '#0ea5e9' : '#1f2937'}
                  strokeWidth={isSel ? 2.5 / scale : 0.75 / scale}
                  onMouseEnter={(ev) =>
                    s.tool === 'select' && setContainerCursor(ev, isSel ? 'move' : 'pointer')
                  }
                  onMouseLeave={(ev) => setContainerCursor(ev, '')}
                />
                {showThis && (
                  <Text
                    listening={false}
                    x={seat.x - halfW}
                    y={seat.y - labelScreenFs / 2}
                    width={halfW * 2}
                    align="center"
                    text={seat.label}
                    fontSize={labelScreenFs}
                    fill="#0f172a"
                  />
                )}
              </Group>
            )
          })}
        </Layer>

        {/* Labels */}
        <Layer>
          {plan.labels.map((l) => (
            <LabelShape key={l.id} l={l} selected={s.selectedLabelId === l.id} scale={scale} />
          ))}
        </Layer>

        {/* Canvas resize handles (interactive) */}
        {s.tool === 'select' && (
          <Layer>
            {([
              { edge: 'r', x: cfg.width, y: cfg.height / 2 },
              { edge: 'b', x: cfg.width / 2, y: cfg.height },
              { edge: 'br', x: cfg.width, y: cfg.height },
            ] as { edge: ResizeEdge; x: number; y: number }[]).map((h) => {
              const sz = 11 / scale
              return (
                <Rect
                  key={h.edge}
                  name={`handle-${h.edge}`}
                  x={h.x}
                  y={h.y}
                  width={sz}
                  height={sz}
                  offsetX={sz / 2}
                  offsetY={sz / 2}
                  fill="#ffffff"
                  stroke="#0ea5e9"
                  strokeWidth={1.5 / scale}
                  onMouseEnter={(ev) => {
                    const c = ev.target.getStage()?.container()
                    if (c) c.style.cursor = edgeCursor(h.edge)
                  }}
                  onMouseLeave={(ev) => {
                    const c = ev.target.getStage()?.container()
                    if (c) c.style.cursor = ''
                  }}
                />
              )
            })}
          </Layer>
        )}

        {/* Arc block center + radius handles */}
        {arcBlock && s.tool === 'select' && (
          <ArcHandles block={arcBlock} scale={scale} />
        )}

        {/* Overlays: marquee + draw preview */}
        <Layer listening={false}>
          {marquee && (
            <Rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(14,165,233,0.12)" stroke="#0ea5e9" strokeWidth={1 / scale} dash={[6 / scale, 4 / scale]} />
          )}
          {draw && (
            <Rect x={draw.x} y={draw.y} width={draw.w} height={draw.h} fill="rgba(100,116,139,0.15)" stroke="#475569" strokeWidth={1 / scale} dash={[6 / scale, 4 / scale]} />
          )}
          {smart.guides.map((g, i) => {
            const color = g.canvas ? '#a855f7' : '#ef4444'
            return g.axis === 'v' ? (
              <Line key={`g${i}`} points={[g.pos, 0, g.pos, cfg.height]} stroke={color} strokeWidth={1 / scale} dash={[5 / scale, 4 / scale]} />
            ) : (
              <Line key={`g${i}`} points={[0, g.pos, cfg.width, g.pos]} stroke={color} strokeWidth={1 / scale} dash={[5 / scale, 4 / scale]} />
            )
          })}
          {smart.dists.map((d, i) => (
            <DistanceMark key={`d${i}`} mark={d} scale={scale} />
          ))}
        </Layer>
      </Stage>

      <div className="canvas-toolbar">
        <button onClick={() => setScale((v) => Math.min(8, v * 1.2))}>+</button>
        <button onClick={() => setScale((v) => Math.max(0.05, v / 1.2))}>−</button>
        <button onClick={fit}>Fit</button>
        <span className="zoom-readout">{Math.round(scale * 100)}%</span>
      </div>

      <CanvasSizeControl
        naturalSize={bgImage ? { w: bgImage.naturalWidth, h: bgImage.naturalHeight } : undefined}
      />

      {resize && (
        <div className="resize-readout" style={{ left: resize.sx + 14, top: resize.sy + 14 }}>
          {resize.w} × {resize.h}
        </div>
      )}
      <div className="canvas-hint">
        <kbd>Space</kbd>+drag pan · scroll zoom · marquee or shift-click to multi-select · drag the selection (✛) to move · <kbd>Ctrl/⌘+C</kbd>/<kbd>V</kbd> copy/paste · <kbd>Del</kbd> delete
      </div>
    </div>
  )
}

function DistanceMark({ mark, scale }: { mark: DistMark; scale: number }) {
  const color = mark.equal ? '#16a34a' : '#2563eb'
  const sw = 1 / scale
  const tick = 5 / scale
  const fs = 11 / scale
  const mid = (mark.a + mark.b) / 2
  if (mark.axis === 'x') {
    return (
      <>
        <Line points={[mark.a, mark.lane, mark.b, mark.lane]} stroke={color} strokeWidth={sw} />
        <Line points={[mark.a, mark.lane - tick, mark.a, mark.lane + tick]} stroke={color} strokeWidth={sw} />
        <Line points={[mark.b, mark.lane - tick, mark.b, mark.lane + tick]} stroke={color} strokeWidth={sw} />
        <Text x={mid - 40} y={mark.lane - fs - tick} width={80} align="center" text={`${Math.abs(mark.value)}`} fontSize={fs} fontStyle="bold" fill={color} />
      </>
    )
  }
  return (
    <>
      <Line points={[mark.lane, mark.a, mark.lane, mark.b]} stroke={color} strokeWidth={sw} />
      <Line points={[mark.lane - tick, mark.a, mark.lane + tick, mark.a]} stroke={color} strokeWidth={sw} />
      <Line points={[mark.lane - tick, mark.b, mark.lane + tick, mark.b]} stroke={color} strokeWidth={sw} />
      <Text x={mark.lane + tick + 2 / scale} y={mid - fs / 2} text={`${Math.abs(mark.value)}`} fontSize={fs} fontStyle="bold" fill={color} />
    </>
  )
}

function FloorShape({ el, selected }: { el: FloorElement; selected: boolean }) {
  const stroke = selected ? '#0ea5e9' : el.stroke
  const sw = selected ? el.strokeWidth + 2 : el.strokeWidth
  if (el.type === 'text') {
    return (
      <Text name="floor" id={el.id} x={el.x} y={el.y} text={el.label} fontSize={el.fontSize} fontStyle="bold" fill={el.fill} rotation={el.rotation} />
    )
  }
  if (el.type === 'line') {
    return (
      <Line name="floor" id={el.id} x={el.x} y={el.y} points={el.points ?? [0, 0, el.width, el.height]} stroke={stroke} strokeWidth={Math.max(sw, 3)} rotation={el.rotation} hitStrokeWidth={12} />
    )
  }
  if (el.type === 'circle') {
    return (
      <Group x={el.x} y={el.y} rotation={el.rotation}>
        <Circle name="floor" id={el.id} x={el.width / 2} y={el.height / 2} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={stroke} strokeWidth={sw} />
        {el.label && <Text listening={false} x={0} y={el.height / 2 - 8} width={el.width} align="center" text={el.label} fontSize={el.fontSize} fill="#0f172a" />}
      </Group>
    )
  }
  // rect / stage
  return (
    <Group x={el.x} y={el.y} rotation={el.rotation}>
      <Rect name="floor" id={el.id} width={el.width} height={el.height} fill={el.fill} stroke={stroke} strokeWidth={sw} cornerRadius={el.type === 'stage' ? 4 : 2} />
      {el.label && (
        <Text listening={false} x={0} y={el.height / 2 - el.fontSize / 2} width={el.width} align="center" text={el.label} fontSize={el.fontSize} fontStyle="bold" fill={el.type === 'stage' ? '#f8fafc' : '#0f172a'} />
      )}
    </Group>
  )
}

function ArcHandles({ block, scale }: { block: ArcBlock; scale: number }) {
  const outer = block.baseRadius + (block.rows - 1) * block.rowGap
  const mid = ((block.startAngleDeg + block.endAngleDeg) / 2) * (Math.PI / 180)
  const hx = block.centerX + Math.cos(mid) * outer
  const hy = block.centerY + Math.sin(mid) * outer
  const r = 8 / scale
  return (
    <Layer>
      <Arc
        listening={false}
        x={block.centerX}
        y={block.centerY}
        innerRadius={block.baseRadius}
        outerRadius={outer}
        angle={block.endAngleDeg - block.startAngleDeg}
        rotation={block.startAngleDeg}
        fill="rgba(14,165,233,0.06)"
        stroke="#0ea5e9"
        strokeWidth={1 / scale}
        dash={[6 / scale, 4 / scale]}
      />
      <Line
        listening={false}
        points={[block.centerX, block.centerY, hx, hy]}
        stroke="#0ea5e9"
        strokeWidth={1 / scale}
        dash={[4 / scale, 4 / scale]}
      />
      <Circle
        name="arc-center"
        x={block.centerX}
        y={block.centerY}
        radius={r}
        fill="#ffffff"
        stroke="#0ea5e9"
        strokeWidth={1.5 / scale}
        onMouseEnter={(ev) => setContainerCursor(ev, 'move')}
        onMouseLeave={(ev) => setContainerCursor(ev, '')}
      />
      <Circle
        name="arc-radius"
        x={hx}
        y={hy}
        radius={r * 1.15}
        fill="#0ea5e9"
        stroke="#ffffff"
        strokeWidth={1.5 / scale}
        onMouseEnter={(ev) => setContainerCursor(ev, 'crosshair')}
        onMouseLeave={(ev) => setContainerCursor(ev, '')}
      />
    </Layer>
  )
}

function LabelShape({ l, selected, scale }: { l: Label; selected: boolean; scale: number }) {
  const fontStyle = [l.italic ? 'italic' : '', l.bold ? 'bold' : ''].join(' ').trim() || 'normal'
  // Approximate text box so alignment + the selection/hit boxes match the text.
  const estW = Math.max(16, l.text.length * l.fontSize * 0.6)
  const estH = l.fontSize * 1.3
  const offsetX = l.align === 'right' ? estW : l.align === 'center' ? estW / 2 : 0
  // generous grab margin, but capped so stacked row labels don't overlap
  const pad = Math.min(6 / scale, l.fontSize * 0.5)
  return (
    <Group x={l.x} y={l.y} rotation={l.rotation}>
      {/* padded transparent hit area so even a 1-char label is easy to grab */}
      <Rect
        name="label"
        id={l.id}
        x={-offsetX - pad}
        y={-pad}
        width={estW + pad * 2}
        height={estH + pad * 2}
        fill="#000000"
        opacity={0.001}
      />
      {selected && (
        <Rect
          listening={false}
          x={-offsetX}
          y={0}
          width={estW}
          height={estH}
          stroke="#0ea5e9"
          strokeWidth={1 / scale}
          dash={[4 / scale, 3 / scale]}
        />
      )}
      <Text
        listening={false}
        x={-offsetX}
        y={0}
        text={l.text || ' '}
        fontSize={l.fontSize}
        fontFamily={l.fontFamily}
        fontStyle={fontStyle}
        fill={l.color}
      />
    </Group>
  )
}

function edgeCursor(edge: ResizeEdge): string {
  return edge === 'r' ? 'ew-resize' : edge === 'b' ? 'ns-resize' : 'nwse-resize'
}

function setContainerCursor(ev: KonvaEventObject<MouseEvent>, cursor: string): void {
  const c = ev.target.getStage()?.container()
  if (c) c.style.cursor = cursor
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

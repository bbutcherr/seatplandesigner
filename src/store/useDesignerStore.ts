import { create } from 'zustand'
import type {
  ArcBlock,
  Configuration,
  FloorElement,
  ID,
  Label,
  Plan,
  Product,
  Project,
  Seat,
} from '../types'
import { rowToken } from '../lib/labels'
import { generateArcBlock } from '../lib/seatGenerators'

const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

// A pleasant default palette used when auto-creating products.
export const PALETTE = [
  '#2d9c6c', '#4db086', '#958dc2', '#f090c7', '#8a436b',
  '#fa8c73', '#f582b2', '#e39012', '#bfed98', '#6ca8e3',
  '#c25b8d', '#5bc2b0',
]

/** Lighten a hex color toward white — used to derive a default "selected"
 *  color from the base color. */
export function brighten(hex: string, amount = 0.4): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return (
    '#' +
    [mix(r), mix(g), mix(b)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  )
}

export function defaultConfiguration(): Configuration {
  return {
    width: 1400,
    height: 1570,
    backgroundUrl: '',
    canvasColor: '#ffffff',
    canvasColor2: '#dbeafe',
    canvasGradient: 'none',
    seatRadius: 15,
    seatLabelSize: 11,
    showSeatLabels: true,
    autoZoomEnabled: true,
    autoZoomLevel: 5,
    autoZoomTarget: 'both',
  }
}

function makeProduct(numId: number, name: string, color: string): Product {
  return { id: uid(), numId, name, color, selectedColor: brighten(color), radius: 15 }
}

function defaultPlan(name = 'Plan 1'): Plan {
  return {
    id: uid(),
    name,
    configuration: defaultConfiguration(),
    products: [makeProduct(1, 'Standard', PALETTE[0])],
    seats: [],
    floorElements: [],
    labels: [],
    arcBlocks: [],
  }
}

export function makeLabel(patch: Partial<Label>): Label {
  return {
    id: uid(),
    text: 'Label',
    x: 0,
    y: 0,
    color: '#0f172a',
    fontFamily: 'sans-serif',
    fontSize: 20,
    bold: false,
    italic: false,
    align: 'left',
    rotation: 0,
    row: false,
    ...patch,
  }
}

/** A snapshot of one copied seat: its label, position relative to the
 *  copied group's top-left anchor, and a full snapshot of its ticket type
 *  (so properties survive paste, even into a plan that lacks that type). */
interface ClipSeat {
  label: string
  dx: number
  dy: number
  product: { name: string; color: string; selectedColor: string; radius: number }
}
interface Clipboard {
  anchorX: number
  anchorY: number
  seats: ClipSeat[]
}

export type AlignMode =
  | 'left'
  | 'hcenter'
  | 'right'
  | 'top'
  | 'vmiddle'
  | 'bottom'

export type Tool =
  | 'select'
  | 'seat-grid'
  | 'seat-row'
  | 'seat-arc'
  | 'seat-click'
  | 'floor-rect'
  | 'floor-stage'
  | 'floor-line'
  | 'floor-circle'
  | 'floor-text'
  | 'label'

interface DesignerState {
  project: Project
  tool: Tool
  activeProductId: ID
  selectedSeatIds: ID[]
  selectedFloorId: ID | null
  selectedLabelId: ID | null
  selectedArcId: ID | null
  clipboard: Clipboard | null
  pasteSeq: number
  snapEnabled: boolean

  // ---- selectors --------------------------------------------------------
  activePlan: () => Plan

  // ---- project / plan ---------------------------------------------------
  setSourceEvent: (name: string) => void
  setActivePlan: (id: ID) => void
  addPlan: () => void
  duplicateActivePlan: () => void
  renamePlan: (id: ID, name: string) => void
  deletePlan: (id: ID) => void
  loadProject: (project: Project) => void

  // ---- config -----------------------------------------------------------
  updateConfig: (patch: Partial<Configuration>) => void

  // ---- products ---------------------------------------------------------
  setActiveProduct: (id: ID) => void
  addProduct: (name?: string) => void
  updateProduct: (id: ID, patch: Partial<Omit<Product, 'id' | 'numId'>>) => void
  deleteProduct: (id: ID) => void
  adjustSeatSizes: (delta: number) => void

  // ---- tool -------------------------------------------------------------
  setTool: (tool: Tool) => void

  // ---- seats ------------------------------------------------------------
  addSeats: (seats: Omit<Seat, 'id' | 'productId'>[], productId?: ID) => void
  updateSeat: (id: ID, patch: Partial<Omit<Seat, 'id'>>) => void
  moveSeats: (ids: ID[], dx: number, dy: number) => void
  deleteSeats: (ids: ID[]) => void
  assignProductToSeats: (ids: ID[], productId: ID) => void
  copySeats: (ids: ID[]) => void
  pasteClipboard: () => void
  setSeatPositions: (updates: { id: ID; x: number; y: number }[]) => void
  alignSeats: (ids: ID[], mode: AlignMode) => void
  distributeSeats: (ids: ID[], axis: 'x' | 'y') => void
  centerOnCanvas: (ids: ID[], axis: 'x' | 'y' | 'both') => void
  setSnapEnabled: (v: boolean) => void

  // ---- floor elements ---------------------------------------------------
  addFloorElement: (el: Omit<FloorElement, 'id'>) => ID
  updateFloorElement: (id: ID, patch: Partial<Omit<FloorElement, 'id'>>) => void
  deleteFloorElement: (id: ID) => void

  // ---- arc blocks -------------------------------------------------------
  createArcBlock: (params: Omit<ArcBlock, 'id' | 'productId'> & { productId?: ID }) => void
  updateArcBlockRadius: (id: ID, baseRadius: number) => void
  moveArcBlock: (id: ID, dx: number, dy: number) => void
  regenerateArcBlock: (id: ID, patch: Partial<ArcBlock>) => void
  deleteArcBlock: (id: ID) => void
  selectArcBlock: (id: ID | null) => void

  // ---- labels -----------------------------------------------------------
  addLabel: (patch: Partial<Label>) => ID
  updateLabel: (id: ID, patch: Partial<Omit<Label, 'id'>>) => void
  deleteLabel: (id: ID) => void
  selectLabel: (id: ID | null) => void
  generateRowLabels: (gap: number) => void

  // ---- selection --------------------------------------------------------
  setSelectedSeats: (ids: ID[]) => void
  toggleSeat: (id: ID, additive: boolean) => void
  clearSelection: () => void
  selectFloor: (id: ID | null) => void
}

/** Apply a mutation to the active plan, returning a fresh project object. */
function withActivePlan(
  project: Project,
  mutate: (plan: Plan) => Plan,
): Project {
  return {
    ...project,
    plans: project.plans.map((p) =>
      p.id === project.activePlanId ? mutate(p) : p,
    ),
  }
}

export const useDesignerStore = create<DesignerState>((set, get) => {
  const initialPlan = defaultPlan()
  return {
    project: {
      version: 1,
      sourceEvent: 'My Event',
      plans: [initialPlan],
      activePlanId: initialPlan.id,
    },
    tool: 'select',
    activeProductId: initialPlan.products[0].id,
    selectedSeatIds: [],
    selectedFloorId: null,
    selectedLabelId: null,
    selectedArcId: null,
    clipboard: null,
    pasteSeq: 0,
    snapEnabled: true,

    activePlan: () => {
      const { project } = get()
      return (
        project.plans.find((p) => p.id === project.activePlanId) ??
        project.plans[0]
      )
    },

    setSourceEvent: (name) =>
      set((s) => ({ project: { ...s.project, sourceEvent: name } })),

    setActivePlan: (id) =>
      set((s) => {
        const plan = s.project.plans.find((p) => p.id === id)
        return {
          project: { ...s.project, activePlanId: id },
          activeProductId: plan?.products[0]?.id ?? s.activeProductId,
          selectedSeatIds: [],
          selectedFloorId: null,
          selectedLabelId: null,
          selectedArcId: null,
        }
      }),

    addPlan: () =>
      set((s) => {
        const plan = defaultPlan(`Plan ${s.project.plans.length + 1}`)
        return {
          project: {
            ...s.project,
            plans: [...s.project.plans, plan],
            activePlanId: plan.id,
          },
          activeProductId: plan.products[0].id,
          selectedSeatIds: [],
        }
      }),

    duplicateActivePlan: () =>
      set((s) => {
        const src = get().activePlan()
        const idMap = new Map<ID, ID>()
        const products = src.products.map((p) => {
          const np = { ...p, id: uid() }
          idMap.set(p.id, np.id)
          return np
        })
        const arcMap = new Map<ID, ID>()
        const arcBlocks = src.arcBlocks.map((b) => {
          const nb = { ...b, id: uid(), productId: idMap.get(b.productId) ?? products[0]?.id }
          arcMap.set(b.id, nb.id)
          return nb
        })
        const copy: Plan = {
          ...src,
          id: uid(),
          name: `${src.name} (copy)`,
          configuration: { ...src.configuration },
          products,
          seats: src.seats.map((seat) => ({
            ...seat,
            id: uid(),
            productId: idMap.get(seat.productId) ?? products[0]?.id,
            ...(seat.arcId ? { arcId: arcMap.get(seat.arcId) } : {}),
          })),
          floorElements: src.floorElements.map((f) => ({ ...f, id: uid() })),
          labels: src.labels.map((l) => ({ ...l, id: uid() })),
          arcBlocks,
        }
        return {
          project: {
            ...s.project,
            plans: [...s.project.plans, copy],
            activePlanId: copy.id,
          },
          activeProductId: copy.products[0]?.id ?? s.activeProductId,
          selectedSeatIds: [],
        }
      }),

    renamePlan: (id, name) =>
      set((s) => ({
        project: {
          ...s.project,
          plans: s.project.plans.map((p) => (p.id === id ? { ...p, name } : p)),
        },
      })),

    deletePlan: (id) =>
      set((s) => {
        if (s.project.plans.length <= 1) return s
        const plans = s.project.plans.filter((p) => p.id !== id)
        const activePlanId =
          s.project.activePlanId === id ? plans[0].id : s.project.activePlanId
        const active = plans.find((p) => p.id === activePlanId)!
        return {
          project: { ...s.project, plans, activePlanId },
          activeProductId: active.products[0]?.id ?? s.activeProductId,
          selectedSeatIds: [],
        }
      }),

    loadProject: (project) =>
      set(() => {
        const active =
          project.plans.find((p) => p.id === project.activePlanId) ??
          project.plans[0]
        return {
          project,
          activeProductId: active.products[0]?.id ?? '',
          selectedSeatIds: [],
          selectedFloorId: null,
          selectedLabelId: null,
          selectedArcId: null,
          tool: 'select',
        }
      }),

    updateConfig: (patch) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          configuration: { ...plan.configuration, ...patch },
        })),
      })),

    setActiveProduct: (id) => set({ activeProductId: id }),

    addProduct: (name) =>
      set((s) => {
        const plan = get().activePlan()
        const numId =
          plan.products.reduce((m, p) => Math.max(m, p.numId), 0) + 1
        const color = PALETTE[(numId - 1) % PALETTE.length]
        const product = makeProduct(
          numId,
          name ?? `Product ${numId}`,
          color,
        )
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            products: [...p.products, product],
          })),
          activeProductId: product.id,
        }
      }),

    updateProduct: (id, patch) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          products: plan.products.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),
      })),

    deleteProduct: (id) =>
      set((s) => {
        const plan = get().activePlan()
        if (plan.products.length <= 1) return s // keep at least one
        const fallback = plan.products.find((p) => p.id !== id)!.id
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            products: p.products.filter((pr) => pr.id !== id),
            seats: p.seats.map((seat) =>
              seat.productId === id ? { ...seat, productId: fallback } : seat,
            ),
          })),
          activeProductId:
            s.activeProductId === id ? fallback : s.activeProductId,
        }
      }),

    // Global +/- : nudge every ticket type's seat size (and the fallback)
    // by `delta`, preserving the relative differences between types.
    adjustSeatSizes: (delta) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          configuration: {
            ...plan.configuration,
            seatRadius: Math.max(1, Math.round(plan.configuration.seatRadius + delta)),
          },
          products: plan.products.map((p) => ({
            ...p,
            radius: Math.max(1, Math.round(p.radius + delta)),
          })),
        })),
      })),

    setTool: (tool) => set({ tool }),

    addSeats: (seats, productId) =>
      set((s) => {
        const pid = productId ?? s.activeProductId
        const newSeats: Seat[] = seats.map((seat) => ({
          ...seat,
          id: uid(),
          productId: pid,
        }))
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            seats: [...p.seats, ...newSeats],
          })),
          selectedSeatIds: newSeats.map((x) => x.id),
        }
      }),

    updateSeat: (id, patch) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          seats: plan.seats.map((seat) =>
            seat.id === id ? { ...seat, ...patch } : seat,
          ),
        })),
      })),

    moveSeats: (ids, dx, dy) =>
      set((s) => {
        const set_ = new Set(ids)
        return {
          project: withActivePlan(s.project, (plan) => ({
            ...plan,
            seats: plan.seats.map((seat) =>
              set_.has(seat.id)
                ? { ...seat, x: Math.round(seat.x + dx), y: Math.round(seat.y + dy) }
                : seat,
            ),
          })),
        }
      }),

    deleteSeats: (ids) =>
      set((s) => {
        const set_ = new Set(ids)
        return {
          project: withActivePlan(s.project, (plan) => ({
            ...plan,
            seats: plan.seats.filter((seat) => !set_.has(seat.id)),
          })),
          selectedSeatIds: s.selectedSeatIds.filter((x) => !set_.has(x)),
        }
      }),

    assignProductToSeats: (ids, productId) =>
      set((s) => {
        const set_ = new Set(ids)
        return {
          project: withActivePlan(s.project, (plan) => ({
            ...plan,
            seats: plan.seats.map((seat) =>
              set_.has(seat.id) ? { ...seat, productId } : seat,
            ),
          })),
        }
      }),

    setSeatPositions: (updates) =>
      set((s) => {
        const map = new Map(updates.map((u) => [u.id, u]))
        return {
          project: withActivePlan(s.project, (plan) => ({
            ...plan,
            seats: plan.seats.map((seat) => {
              const u = map.get(seat.id)
              return u ? { ...seat, x: Math.round(u.x), y: Math.round(u.y) } : seat
            }),
          })),
        }
      }),

    alignSeats: (ids, mode) =>
      set((s) => {
        const plan = get().activePlan()
        const sel = plan.seats.filter((seat) => ids.includes(seat.id))
        if (sel.length < 2) return s
        const minX = Math.min(...sel.map((p) => p.x))
        const maxX = Math.max(...sel.map((p) => p.x))
        const minY = Math.min(...sel.map((p) => p.y))
        const maxY = Math.max(...sel.map((p) => p.y))
        const target = (seat: Seat): Partial<Seat> => {
          switch (mode) {
            case 'left': return { x: minX }
            case 'right': return { x: maxX }
            case 'hcenter': return { x: Math.round((minX + maxX) / 2) }
            case 'top': return { y: minY }
            case 'bottom': return { y: maxY }
            case 'vmiddle': return { y: Math.round((minY + maxY) / 2) }
          }
          return seat
        }
        const set_ = new Set(ids)
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            seats: p.seats.map((seat) =>
              set_.has(seat.id) ? { ...seat, ...target(seat) } : seat,
            ),
          })),
        }
      }),

    distributeSeats: (ids, axis) =>
      set((s) => {
        const plan = get().activePlan()
        const sel = plan.seats
          .filter((seat) => ids.includes(seat.id))
          .sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y))
        if (sel.length < 3) return s
        const first = axis === 'x' ? sel[0].x : sel[0].y
        const last = axis === 'x' ? sel[sel.length - 1].x : sel[sel.length - 1].y
        const step = (last - first) / (sel.length - 1)
        const pos = new Map<ID, number>()
        sel.forEach((seat, i) => pos.set(seat.id, Math.round(first + step * i)))
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            seats: p.seats.map((seat) =>
              pos.has(seat.id)
                ? axis === 'x'
                  ? { ...seat, x: pos.get(seat.id)! }
                  : { ...seat, y: pos.get(seat.id)! }
                : seat,
            ),
          })),
        }
      }),

    centerOnCanvas: (ids, axis) =>
      set((s) => {
        const plan = get().activePlan()
        const sel = plan.seats.filter((seat) => ids.includes(seat.id))
        if (sel.length === 0) return s
        const minX = Math.min(...sel.map((p) => p.x))
        const maxX = Math.max(...sel.map((p) => p.x))
        const minY = Math.min(...sel.map((p) => p.y))
        const maxY = Math.max(...sel.map((p) => p.y))
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        const dx = axis === 'x' || axis === 'both' ? plan.configuration.width / 2 - cx : 0
        const dy = axis === 'y' || axis === 'both' ? plan.configuration.height / 2 - cy : 0
        const set_ = new Set(ids)
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            seats: p.seats.map((seat) =>
              set_.has(seat.id)
                ? { ...seat, x: Math.round(seat.x + dx), y: Math.round(seat.y + dy) }
                : seat,
            ),
          })),
        }
      }),

    setSnapEnabled: (v) => set({ snapEnabled: v }),

    copySeats: (ids) => {
      const plan = get().activePlan()
      const sel = plan.seats.filter((seat) => ids.includes(seat.id))
      if (sel.length === 0) return
      const anchorX = Math.min(...sel.map((s) => s.x))
      const anchorY = Math.min(...sel.map((s) => s.y))
      const byId = new Map(plan.products.map((p) => [p.id, p]))
      const seats: ClipSeat[] = sel.map((s) => {
        const p = byId.get(s.productId)
        return {
          label: s.label,
          dx: s.x - anchorX,
          dy: s.y - anchorY,
          product: p
            ? { name: p.name, color: p.color, selectedColor: p.selectedColor, radius: p.radius }
            : { name: 'Standard', color: PALETTE[0], selectedColor: brighten(PALETTE[0]), radius: 15 },
        }
      })
      set({ clipboard: { anchorX, anchorY, seats }, pasteSeq: 0 })
    },

    pasteClipboard: () => {
      const st = get()
      const cb = st.clipboard
      if (!cb || cb.seats.length === 0) return
      const plan = st.activePlan()
      const seq = st.pasteSeq + 1
      const offset = 24 * seq // cascade repeated pastes so copies don't stack

      // Resolve each copied seat's ticket type by name in the target plan,
      // recreating it (with its colors) if the plan doesn't have it yet.
      const productsByName = new Map(plan.products.map((p) => [p.name, p]))
      const newProducts: Product[] = []
      let nextNumId = plan.products.reduce((m, p) => Math.max(m, p.numId), 0)
      const resolveProduct = (snap: ClipSeat['product']): Product => {
        const found = productsByName.get(snap.name)
        if (found) return found
        nextNumId += 1
        const created: Product = {
          id: uid(),
          numId: nextNumId,
          name: snap.name,
          color: snap.color,
          selectedColor: snap.selectedColor,
          radius: snap.radius,
        }
        productsByName.set(snap.name, created)
        newProducts.push(created)
        return created
      }

      const existing = new Set(plan.seats.map((s) => s.label))
      const uniqueLabel = (base: string): string => {
        if (!existing.has(base)) {
          existing.add(base)
          return base
        }
        let k = 2
        while (existing.has(`${base}_${k}`)) k++
        const label = `${base}_${k}`
        existing.add(label)
        return label
      }

      const newSeats: Seat[] = cb.seats.map((cs) => ({
        id: uid(),
        label: uniqueLabel(cs.label),
        x: Math.round(cb.anchorX + offset + cs.dx),
        y: Math.round(cb.anchorY + offset + cs.dy),
        productId: resolveProduct(cs.product).id,
      }))

      set((s) => ({
        project: withActivePlan(s.project, (p) => ({
          ...p,
          products: [...p.products, ...newProducts],
          seats: [...p.seats, ...newSeats],
        })),
        pasteSeq: seq,
        selectedSeatIds: newSeats.map((x) => x.id),
        selectedFloorId: null,
      }))
    },

    addFloorElement: (el) => {
      const id = uid()
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          floorElements: [...plan.floorElements, { ...el, id }],
        })),
        selectedFloorId: id,
      }))
      return id
    },

    updateFloorElement: (id, patch) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          floorElements: plan.floorElements.map((f) =>
            f.id === id ? { ...f, ...patch } : f,
          ),
        })),
      })),

    deleteFloorElement: (id) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          floorElements: plan.floorElements.filter((f) => f.id !== id),
        })),
        selectedFloorId: s.selectedFloorId === id ? null : s.selectedFloorId,
      })),

    setSelectedSeats: (ids) =>
      set({ selectedSeatIds: ids, selectedFloorId: null, selectedLabelId: null, selectedArcId: null }),

    toggleSeat: (id, additive) =>
      set((s) => {
        if (!additive)
          return { selectedSeatIds: [id], selectedFloorId: null, selectedLabelId: null, selectedArcId: null }
        return {
          selectedSeatIds: s.selectedSeatIds.includes(id)
            ? s.selectedSeatIds.filter((x) => x !== id)
            : [...s.selectedSeatIds, id],
          selectedFloorId: null,
          selectedLabelId: null,
          selectedArcId: null,
        }
      }),

    clearSelection: () =>
      set({ selectedSeatIds: [], selectedFloorId: null, selectedLabelId: null, selectedArcId: null }),

    selectFloor: (id) =>
      set({ selectedFloorId: id, selectedSeatIds: [], selectedLabelId: null, selectedArcId: null }),

    createArcBlock: (params) =>
      set((s) => {
        const productId = params.productId ?? s.activeProductId
        const block: ArcBlock = { ...params, id: uid(), productId }
        const drafts = generateArcBlock(block)
        const newSeats: Seat[] = drafts.map((d) => ({
          ...d,
          id: uid(),
          productId,
          arcId: block.id,
        }))
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            arcBlocks: [...p.arcBlocks, block],
            seats: [...p.seats, ...newSeats],
          })),
          selectedArcId: block.id,
          selectedSeatIds: [],
          selectedFloorId: null,
          selectedLabelId: null,
        }
      }),

    // Radius handle: shift every row out by the same delta (gaps stay constant)
    // by moving each block seat radially from the block center.
    updateArcBlockRadius: (id, baseRadius) =>
      set((s) => {
        const plan = get().activePlan()
        const block = plan.arcBlocks.find((b) => b.id === id)
        if (!block) return s
        const clamped = Math.max(10, Math.round(baseRadius))
        const delta = clamped - block.baseRadius
        if (delta === 0) return s
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            arcBlocks: p.arcBlocks.map((b) => (b.id === id ? { ...b, baseRadius: clamped } : b)),
            seats: p.seats.map((seat) => {
              if (seat.arcId !== id) return seat
              const dx = seat.x - block.centerX
              const dy = seat.y - block.centerY
              const len = Math.hypot(dx, dy)
              if (len === 0) return seat
              return {
                ...seat,
                x: Math.round(seat.x + (dx / len) * delta),
                y: Math.round(seat.y + (dy / len) * delta),
              }
            }),
          })),
        }
      }),

    moveArcBlock: (id, dx, dy) =>
      set((s) => ({
        project: withActivePlan(s.project, (p) => ({
          ...p,
          arcBlocks: p.arcBlocks.map((b) =>
            b.id === id ? { ...b, centerX: b.centerX + dx, centerY: b.centerY + dy } : b,
          ),
          seats: p.seats.map((seat) =>
            seat.arcId === id
              ? { ...seat, x: Math.round(seat.x + dx), y: Math.round(seat.y + dy) }
              : seat,
          ),
        })),
      })),

    // Structural change (rows/cols/angles/gap/labels): regenerate the block's
    // seats from the new params.
    regenerateArcBlock: (id, patch) =>
      set((s) => {
        const plan = get().activePlan()
        const block = plan.arcBlocks.find((b) => b.id === id)
        if (!block) return s
        const next: ArcBlock = { ...block, ...patch }
        const drafts = generateArcBlock(next)
        const newSeats: Seat[] = drafts.map((d) => ({
          ...d,
          id: uid(),
          productId: next.productId,
          arcId: id,
        }))
        return {
          project: withActivePlan(s.project, (p) => ({
            ...p,
            arcBlocks: p.arcBlocks.map((b) => (b.id === id ? next : b)),
            seats: [...p.seats.filter((seat) => seat.arcId !== id), ...newSeats],
          })),
          selectedSeatIds: [],
        }
      }),

    deleteArcBlock: (id) =>
      set((s) => ({
        project: withActivePlan(s.project, (p) => ({
          ...p,
          arcBlocks: p.arcBlocks.filter((b) => b.id !== id),
          seats: p.seats.filter((seat) => seat.arcId !== id),
        })),
        selectedArcId: s.selectedArcId === id ? null : s.selectedArcId,
      })),

    selectArcBlock: (id) =>
      set({ selectedArcId: id, selectedSeatIds: [], selectedFloorId: null, selectedLabelId: null }),

    addLabel: (patch) => {
      const label = makeLabel(patch)
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          labels: [...plan.labels, label],
        })),
        selectedLabelId: label.id,
        selectedSeatIds: [],
        selectedFloorId: null,
        selectedArcId: null,
      }))
      return label.id
    },

    updateLabel: (id, patch) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          labels: plan.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      })),

    deleteLabel: (id) =>
      set((s) => ({
        project: withActivePlan(s.project, (plan) => ({
          ...plan,
          labels: plan.labels.filter((l) => l.id !== id),
        })),
        selectedLabelId: s.selectedLabelId === id ? null : s.selectedLabelId,
      })),

    selectLabel: (id) =>
      set({ selectedLabelId: id, selectedSeatIds: [], selectedFloorId: null, selectedArcId: null }),

    generateRowLabels: (gap) =>
      set((s) => {
        const plan = get().activePlan()
        const radiusOf = (seat: Seat) =>
          plan.products.find((p) => p.id === seat.productId)?.radius ?? plan.configuration.seatRadius
        // Group seats by their label's row token (e.g. A1,A2 -> "A").
        const groups = new Map<string, Seat[]>()
        for (const seat of plan.seats) {
          const token = rowToken(seat.label)
          const arr = groups.get(token)
          if (arr) arr.push(seat)
          else groups.set(token, [seat])
        }
        const fresh: Label[] = []
        for (const [token, seats] of groups) {
          const left = seats.reduce((a, b) => (b.x < a.x ? b : a))
          const right = seats.reduce((a, b) => (b.x > a.x ? b : a))
          const fontSize = 20
          // gap is clearance beyond the seat's edge, so big seats (e.g. tables)
          // don't crowd the label.
          fresh.push(
            makeLabel({
              text: token,
              x: Math.round(left.x - radiusOf(left) - gap),
              y: Math.round(left.y - fontSize / 2),
              align: 'right',
              bold: true,
              fontSize,
              row: true,
            }),
            makeLabel({
              text: token,
              x: Math.round(right.x + radiusOf(right) + gap),
              y: Math.round(right.y - fontSize / 2),
              align: 'left',
              bold: true,
              fontSize,
              row: true,
            }),
          )
        }
        return {
          project: withActivePlan(s.project, (plan2) => ({
            ...plan2,
            // replace any previously generated row labels
            labels: [...plan2.labels.filter((l) => !l.row), ...fresh],
          })),
          selectedLabelId: null,
        }
      }),
  }
})

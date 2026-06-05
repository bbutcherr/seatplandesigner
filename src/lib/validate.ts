import type { Plan, Project } from '../types'

export interface SeatIssue {
  id: string
  label: string
  reason: 'no-product' | 'empty-name'
}

export interface PlanIssue {
  planId: string
  planName: string
  seats: SeatIssue[]
}

export interface ValidationResult {
  ok: boolean
  issues: PlanIssue[]
  total: number // total offending seats across all plans
}

/** Seats in a plan that don't have a usable ticket type: either the product
 *  reference is missing, or the referenced product has a blank name. */
export function planSeatsMissingProduct(plan: Plan): SeatIssue[] {
  const byId = new Map(plan.products.map((p) => [p.id, p]))
  const out: SeatIssue[] = []
  for (const seat of plan.seats) {
    const product = seat.productId ? byId.get(seat.productId) : undefined
    if (!product) out.push({ id: seat.id, label: seat.label, reason: 'no-product' })
    else if (!product.name.trim()) out.push({ id: seat.id, label: seat.label, reason: 'empty-name' })
  }
  return out
}

/** Validate the whole project for export: every seat must have a ticket type. */
export function validateProjectForExport(project: Project): ValidationResult {
  const issues: PlanIssue[] = []
  let total = 0
  for (const plan of project.plans) {
    const seats = planSeatsMissingProduct(plan)
    if (seats.length) {
      issues.push({ planId: plan.id, planName: plan.name, seats })
      total += seats.length
    }
  }
  return { ok: issues.length === 0, issues, total }
}

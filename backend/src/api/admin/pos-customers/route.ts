import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: ["id", "display_id", "total", "created_at", "status", "metadata"],
      variables: { filters: { is_draft_order: false }, skip: 0, take: 2000 },
    },
  })

  const { rows: orders } = result as any

  const byKey = new Map<string, {
    name: string; phone: string; note: string
    order_count: number; last_order_id: string
    last_order_display_id: number; last_order_at: string; total_spent: number
  }>()

  for (const order of orders ?? []) {
    const meta = (order as any).metadata ?? {}
    const name = String(meta.customer_name ?? "").trim()
    const phone = String(meta.customer_phone ?? "").trim()
    if (!name && !phone) continue
    const key = phone || name
    const existing = byKey.get(key)
    const orderTotal = (order as any).total ?? 0
    if (!existing || order.created_at > existing.last_order_at) {
      byKey.set(key, {
        name, phone,
        note: String(meta.customer_note ?? "").trim(),
        order_count: (existing?.order_count ?? 0) + 1,
        last_order_id: order.id,
        last_order_display_id: order.display_id,
        last_order_at: order.created_at,
        total_spent: (existing?.total_spent ?? 0) + orderTotal,
      })
    } else {
      existing.order_count++
      existing.total_spent += orderTotal
    }
  }

  const customers = [...byKey.values()].sort((a, b) =>
    b.last_order_at.localeCompare(a.last_order_at)
  )

  res.json({ customers })
}

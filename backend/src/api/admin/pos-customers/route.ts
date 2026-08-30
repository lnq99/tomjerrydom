import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await (query.graph({
    entity: "order",
    fields: ["id", "display_id", "total", "created_at", "status", "metadata"],
    pagination: { limit: 2000, offset: 0 },
  }) as Promise<{ data: any[] }>)

  // Aggregate unique customers keyed by phone, falling back to name
  const byKey = new Map<string, {
    name: string; phone: string; note: string
    order_count: number; last_order_id: string
    last_order_display_id: number; last_order_at: string; total_spent: number
  }>()

  for (const order of orders ?? []) {
    const meta = order.metadata ?? {}
    const name = String(meta.customer_name ?? "").trim()
    const phone = String(meta.customer_phone ?? "").trim()
    if (!name && !phone) continue
    const key = phone || name
    const existing = byKey.get(key)
    if (!existing || order.created_at > existing.last_order_at) {
      byKey.set(key, {
        name, phone,
        note: String(meta.customer_note ?? "").trim(),
        order_count: (existing?.order_count ?? 0) + 1,
        last_order_id: order.id,
        last_order_display_id: order.display_id,
        last_order_at: order.created_at,
        total_spent: (existing?.total_spent ?? 0) + (order.total ?? 0) * 100,
      })
    } else {
      existing.order_count++
      existing.total_spent += (order.total ?? 0) * 100
    }
  }

  const customers = [...byKey.values()].sort((a, b) =>
    b.last_order_at.localeCompare(a.last_order_at)
  )

  res.json({ customers })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const orderModule = req.scope.resolve(Modules.ORDER)

  const order = await orderModule.retrieveOrder(id, { relations: ["items"] })

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      created_at: order.created_at,
      metadata: order.metadata ?? {},
      items: ((order as any).items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        unit_price: (item.unit_price ?? 0) * 100, // Medusa stores rubles; frontend expects kopecks
        thumbnail: item.thumbnail ?? null,
        metadata: item.metadata ?? {},
      })),
    },
  })
}

type ItemAction =
  | { action: "update"; id: string; quantity?: number; unit_price?: number; metadata?: Record<string, unknown> }
  | { action: "add"; title: string; variant_id?: string; quantity?: number; unit_price?: number; metadata?: Record<string, unknown> }

type PatchBody = {
  items?: ItemAction[]
  metadata?: Record<string, unknown>
  complete?: boolean
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const { items, metadata, complete } = req.body as PatchBody
  const orderModule = req.scope.resolve(Modules.ORDER)

  if (items) {
    const toUpdate = items.filter((i): i is Extract<ItemAction, { action: "update" }> => i.action === "update")
    const toAdd = items.filter((i): i is Extract<ItemAction, { action: "add" }> => i.action === "add")

    for (const item of toUpdate) {
      const update: Record<string, unknown> = {}
      if (item.quantity !== undefined) update.quantity = item.quantity
      if (item.unit_price !== undefined) update.unit_price = Math.round(item.unit_price / 100) // frontend sends kopecks; convert to rubles
      if (item.metadata !== undefined) update.metadata = item.metadata
      await orderModule.updateOrderLineItems(item.id, update)
    }

    if (toAdd.length) {
      await orderModule.createOrderLineItems(
        id,
        toAdd.map((item) => ({
          title: item.title,
          variant_id: item.variant_id ?? undefined,
          quantity: item.quantity ?? 1,
          unit_price: Math.round((item.unit_price ?? 0) / 100), // frontend sends kopecks; convert to rubles
          metadata: item.metadata ?? {},
        }))
      )
    }
  }

  if (metadata) {
    const existing = await orderModule.retrieveOrder(id, { select: ["id", "metadata"] })
    await orderModule.updateOrders(id, {
      metadata: { ...(existing.metadata ?? {}), ...metadata },
    })
  }

  if (complete) {
    await orderModule.completeOrder(id)
  }

  res.json({ success: true })
}

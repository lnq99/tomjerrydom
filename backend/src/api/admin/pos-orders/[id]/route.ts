import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  markPaymentCollectionAsPaid,
} from "@medusajs/medusa/core-flows"

/** Deduct stocked_quantity for each item at the first available stock location. Allows negative. */
async function deductVariantStock(
  scope: MedusaRequest["scope"],
  items: { variant_id?: string | null; quantity: number }[]
) {
  const withVariant = items.filter((i) => i.variant_id && i.quantity > 0)
  if (!withVariant.length) return

  try {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const inventoryModule = scope.resolve(Modules.INVENTORY)

    const { data: locations } = await (query.graph({
      entity: "stock_location",
      fields: ["id"],
    }) as Promise<{ data: { id: string }[] }>)
    const locationId = locations?.[0]?.id
    if (!locationId) return

    const variantIds = withVariant.map((i) => i.variant_id!)
    const { data: links } = await (query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.id", "inventory_items.inventory_item_id"],
      filters: { id: variantIds },
    }) as Promise<{ data: { id: string; inventory_items?: { id: string; inventory_item_id?: string }[] }[] }>)

    const variantToInvItem = new Map<string, string>()
    for (const v of links ?? []) {
      const inv = v.inventory_items?.[0]
      const invId = inv?.inventory_item_id ?? inv?.id
      if (invId) variantToInvItem.set(v.id, invId)
    }
    if (!variantToInvItem.size) return

    const invItemIds = [...variantToInvItem.values()]
    const levels = await inventoryModule.listInventoryLevels({
      inventory_item_id: invItemIds,
      location_id: locationId,
    })
    const levelMap = new Map<string, any>(levels.map((l: any) => [l.inventory_item_id, l]))

    const updates: { id: string; stocked_quantity: number }[] = []
    for (const item of withVariant) {
      const invId = variantToInvItem.get(item.variant_id!)
      if (!invId) continue
      const level = levelMap.get(invId)
      if (!level) continue
      updates.push({ id: level.id, stocked_quantity: (level.stocked_quantity ?? 0) - item.quantity })
    }
    if (updates.length) {
      await inventoryModule.updateInventoryLevels(updates)
    }
  } catch {
    // Non-fatal
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const orderModule = req.scope.resolve(Modules.ORDER)

  const order = await orderModule.retrieveOrder(id, { relations: ["items"] })

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      payment_status: (order as any).payment_status ?? null,
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
  mark_paid?: boolean
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const { items, metadata, complete, mark_paid } = req.body as PatchBody
  const orderModule = req.scope.resolve(Modules.ORDER)

  if (items) {
    const toUpdate = items.filter((i): i is Extract<ItemAction, { action: "update" }> => i.action === "update")
    const toAdd = items.filter((i): i is Extract<ItemAction, { action: "add" }> => i.action === "add")

    for (const item of toUpdate) {
      const update: Record<string, unknown> = {}
      if (item.quantity !== undefined) update.quantity = item.quantity
      if (item.unit_price !== undefined) update.unit_price = Math.round(item.unit_price / 100) // kopecks → rubles
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
          unit_price: Math.round((item.unit_price ?? 0) / 100), // kopecks → rubles
          metadata: item.metadata ?? {},
        }))
      )
    }
  }

  if (metadata) {
    const existing = await orderModule.retrieveOrder(id, { select: ["id", "metadata"] })
    const merged = { ...(existing.metadata ?? {}), ...metadata }

    // When picking is confirmed: deduct stock (once, tracked by stock_deducted flag)
    if (metadata.picking_done && !existing.metadata?.stock_deducted) {
      const orderWithItems = await orderModule.retrieveOrder(id, { relations: ["items"] })
      await deductVariantStock(
        req.scope,
        ((orderWithItems as any).items ?? []).map((i: any) => ({
          variant_id: i.variant_id ?? null,
          quantity: i.quantity,
        }))
      )
      merged.stock_deducted = true
    }

    await orderModule.updateOrders(id, { metadata: merged })
  }

  if (complete) {
    await orderModule.completeOrder(id)
  }

  if (mark_paid) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: orders } = await (query.graph({
        entity: "order",
        fields: ["id", "total", "payment_collections.id", "payment_collections.status"],
        filters: { id },
      }) as Promise<{ data: { id: string; total?: number; payment_collections?: { id: string; status: string }[] }[] }>)

      const orderData = orders?.[0]
      const existingCollection = orderData?.payment_collections?.find((pc) => pc.status !== "canceled")

      if (existingCollection) {
        await markPaymentCollectionAsPaid(req.scope).run({
          input: { order_id: id, payment_collection_id: existingCollection.id },
        })
      } else {
        const orderForTotal = await orderModule.retrieveOrder(id, { select: ["id", "total"] })
        const { result: collections } = await createOrderPaymentCollectionWorkflow(req.scope).run({
          input: { order_id: id, amount: (orderForTotal as any).total ?? 0 },
        })
        await markPaymentCollectionAsPaid(req.scope).run({
          input: { order_id: id, payment_collection_id: collections[0].id },
        })
      }
    } catch (e: any) {
      return res.status(500).json({ message: e?.message ?? "Payment capture failed" })
    }
  }

  res.json({ success: true })
}

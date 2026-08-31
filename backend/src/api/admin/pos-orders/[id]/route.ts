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
    // No location filter — find wherever each item is actually stocked
    const levels = await inventoryModule.listInventoryLevels({
      inventory_item_id: invItemIds,
    })
    // Per inventory_item_id, pick the level with the most stocked_quantity
    const levelMap = new Map<string, any>()
    for (const l of levels as any[]) {
      const prev = levelMap.get(l.inventory_item_id)
      if (!prev || (l.stocked_quantity ?? 0) > (prev.stocked_quantity ?? 0)) {
        levelMap.set(l.inventory_item_id, l)
      }
    }

    const updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
    for (const item of withVariant) {
      const invId = variantToInvItem.get(item.variant_id!)
      if (!invId) continue
      const level = levelMap.get(invId)
      if (!level) continue
      updates.push({
        inventory_item_id: invId,
        location_id: level.location_id,
        stocked_quantity: (level.stocked_quantity ?? 0) - item.quantity,
      })
    }
    if (updates.length) {
      await inventoryModule.updateInventoryLevels(updates as any)
    }
  } catch {
    // Non-fatal
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const orderModule = req.scope.resolve(Modules.ORDER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const [order, { data: graph }] = await Promise.all([
    orderModule.retrieveOrder(id, { relations: ["items"] }),
    query.graph({
      entity: "order",
      fields: ["id", "payment_collections.id", "payment_collections.status"],
      filters: { id },
    }) as Promise<{ data: { id: string; payment_collections?: { id: string; status: string }[] }[] }>,
  ])

  const paymentCollections = graph?.[0]?.payment_collections ?? []
  const paymentStatus = paymentCollections.some((pc) => pc.status === "captured")
    ? "captured"
    : paymentCollections.some((pc) => pc.status === "partially_captured")
    ? "partially_captured"
    : paymentCollections.length > 0
    ? paymentCollections[0].status
    : "not_paid"

  // Fetch cost from product.metadata.cost (kopecks) for each variant
  const variantIds = ((order as any).items ?? []).map((i: any) => i.variant_id).filter(Boolean)
  const costMap: Record<string, number> = {}
  if (variantIds.length) {
    const { data: variants } = await (query.graph({
      entity: "product_variant",
      fields: ["id", "product.metadata"],
      filters: { id: variantIds },
    }) as Promise<{ data: { id: string; product?: { metadata?: Record<string, unknown> | null } | null }[] }>)
    for (const v of variants ?? []) {
      const cost = (v.product?.metadata?.cost as number) ?? 0
      costMap[v.id] = Math.round(cost) // already in kopecks
    }
  }

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      payment_status: paymentStatus,
      created_at: order.created_at,
      metadata: order.metadata ?? {},
      items: ((order as any).items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        unit_price: (item.unit_price ?? 0) * 100,
        // Prefer snapshotted cost from item metadata; fall back to current product cost
        cost_price: (item.metadata?.cost_price as number) ?? costMap[item.variant_id] ?? 0,
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
  cancel?: boolean
  archive?: boolean
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const { items, metadata, complete, mark_paid, cancel, archive } = req.body as PatchBody
  const orderModule = req.scope.resolve(Modules.ORDER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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

    // When picking is confirmed: create inventory reservations for picked quantities
    if (metadata.picking_done && !existing.metadata?.picking_done) {
      try {
        const inventoryModule = req.scope.resolve(Modules.INVENTORY)
        const orderWithItems = await orderModule.retrieveOrder(id, { relations: ["items"] })
        const pickedQtys = (metadata.picked_quantities ?? {}) as Record<string, number>

        const variantIds = ((orderWithItems as any).items ?? [])
          .map((i: any) => i.variant_id).filter(Boolean)

        if (variantIds.length) {
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

          if (variantToInvItem.size) {
            const invItemIds = [...variantToInvItem.values()]
            const levels = await inventoryModule.listInventoryLevels({ inventory_item_id: invItemIds })
            const levelMap = new Map<string, any>()
            for (const l of levels as any[]) {
              const prev = levelMap.get(l.inventory_item_id)
              if (!prev || (l.stocked_quantity ?? 0) > (prev.stocked_quantity ?? 0)) {
                levelMap.set(l.inventory_item_id, l)
              }
            }

            const reservationInputs: { inventory_item_id: string; location_id: string; quantity: number; line_item_id?: string }[] = []
            for (const item of (orderWithItems as any).items ?? []) {
              if (!item.variant_id) continue
              const qty = pickedQtys[item.id] ?? item.quantity
              if (qty <= 0) continue
              const invId = variantToInvItem.get(item.variant_id)
              if (!invId) continue
              const level = levelMap.get(invId)
              if (!level) continue
              reservationInputs.push({
                inventory_item_id: invId,
                location_id: level.location_id,
                quantity: qty,
                line_item_id: item.id,
              })
            }

            if (reservationInputs.length) {
              const reservations = await inventoryModule.createReservationItems(reservationInputs as any)
              merged.reservation_ids = (reservations as any[]).map((r) => r.id)
            }
          }
        }
      } catch {
        // Non-fatal: order metadata still saved
      }
    }

    await orderModule.updateOrders(id, { metadata: merged })
  }

  if (complete) {
    const orderForComplete = await orderModule.retrieveOrder(id, { relations: ["items"] })
    const completeMeta = (orderForComplete as any).metadata ?? {}

    if (!completeMeta.stock_deducted) {
      // Delete reservations created at picking time
      const reservationIds = (completeMeta.reservation_ids as string[]) ?? []
      if (reservationIds.length) {
        try {
          const inventoryModule = req.scope.resolve(Modules.INVENTORY)
          await inventoryModule.deleteReservationItems(reservationIds)
        } catch { /* non-fatal */ }
      }

      // Deduct stocked_quantity for picked amounts
      const pickedQtys = (completeMeta.picked_quantities ?? {}) as Record<string, number>
      await deductVariantStock(
        req.scope,
        ((orderForComplete as any).items ?? []).map((i: any) => ({
          variant_id: i.variant_id ?? null,
          quantity: pickedQtys[i.id] ?? i.quantity,
        }))
      )
      await orderModule.updateOrders(id, {
        metadata: { ...completeMeta, stock_deducted: true },
      })
    }
    await orderModule.completeOrder(id)
  }

  if (cancel) {
    await orderModule.cancelOrder(id)
  }

  if (archive) {
    await orderModule.updateOrders(id, { status: "archived" } as any)
  }

  if (mark_paid) {
    try {
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

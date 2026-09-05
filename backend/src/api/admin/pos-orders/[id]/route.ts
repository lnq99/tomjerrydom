import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  capturePaymentWorkflow,
  createOrderPaymentCollectionWorkflow,
  markPaymentCollectionAsPaid,
} from "@medusajs/medusa/core-flows"
import { reserveInventoryForOrder } from "../route"

/** Return (add back) stocked_quantity for each item — inverse of deductVariantStock. */
async function returnVariantStock(
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
    }) as unknown as Promise<{ data: { id: string; inventory_items?: { id: string; inventory_item_id?: string }[] }[] }>)

    const variantToInvItem = new Map<string, string>()
    for (const v of links ?? []) {
      const inv = v.inventory_items?.[0]
      const invId = inv?.inventory_item_id ?? inv?.id
      if (invId) variantToInvItem.set(v.id, invId)
    }
    if (!variantToInvItem.size) return

    const invItemIds = [...variantToInvItem.values()]
    const levels = await inventoryModule.listInventoryLevels({ inventory_item_id: invItemIds })
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
        stocked_quantity: (level.stocked_quantity ?? 0) + item.quantity,
      })
    }
    if (updates.length) {
      await inventoryModule.updateInventoryLevels(updates as any)
    }
  } catch {
    // Non-fatal
  }
}

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
    }) as unknown as Promise<{ data: { id: string; inventory_items?: { id: string; inventory_item_id?: string }[] }[] }>)

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

  const [order, { data: paymentGraph }] = await Promise.all([
    orderModule.retrieveOrder(id, { relations: ["items"] }),
    query.graph({
      entity: "order",
      fields: [
        "id",
        "payment_collections.id",
        "payment_collections.status",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
      ],
      filters: { id },
    }) as Promise<{
      data: {
        id: string
        payment_collections?: {
          id: string
          status: string
          payments?: { id: string; captured_at?: string | null }[]
        }[]
      }[]
    }>,
  ])

  const collections = paymentGraph?.[0]?.payment_collections ?? []
  const hasCapturedPayment = collections.some(
    (pc) =>
      pc.status === "captured" ||
      pc.payments?.some((p) => p.captured_at != null)
  )
  const paymentStatus = (order.status as string) === "canceled"
    ? "not_paid"
    : hasCapturedPayment
    ? "captured"
    : collections.length > 0
    ? collections[0].status ?? "not_paid"
    : "not_paid"

  // Fetch cost from product.metadata.cost (rubles) for each variant as fallback
  const variantIds = ((order as any).items ?? []).map((i: any) => i.variant_id).filter(Boolean)
  const costMap: Record<string, number> = {}
  if (variantIds.length) {
    const { data: variants } = await (query.graph({
      entity: "product_variant",
      fields: ["id", "product.metadata"],
      filters: { id: variantIds },
    }) as Promise<{ data: { id: string; product?: { metadata?: Record<string, unknown> | null } | null }[] }>)
    for (const v of variants ?? []) {
      costMap[v.id] = Math.round((v.product?.metadata?.cost as number) ?? 0)
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
        unit_price: item.unit_price ?? 0,
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
      if (item.unit_price !== undefined) update.unit_price = Math.round(item.unit_price)
      if (item.metadata !== undefined) update.metadata = item.metadata
      await orderModule.updateOrderLineItems(item.id, update)

      // Sync inventory reservation to the new quantity
      if (item.quantity !== undefined) {
        try {
          const inventoryModule = req.scope.resolve(Modules.INVENTORY)
          const existingReservations = await inventoryModule.listReservationItems({ line_item_id: item.id })
          if (existingReservations.length) {
            if (item.quantity <= 0) {
              await inventoryModule.deleteReservationItems(existingReservations.map((r: any) => r.id))
            } else {
              await inventoryModule.updateReservationItems(
                existingReservations.map((r: any) => ({ id: r.id, quantity: item.quantity })) as any
              )
            }
          } else if (item.quantity > 0) {
            // No reservation yet — look up variant_id from the order and create one
            const orderWithItems = await orderModule.retrieveOrder(id, { relations: ["items"] })
            const lineItem = ((orderWithItems as any).items ?? []).find((i: any) => i.id === item.id)
            const variantId = lineItem?.variant_id
            if (variantId) {
              await reserveInventoryForOrder(req.scope, [{ id: item.id, variant_id: variantId, quantity: item.quantity }])
            }
          }
        } catch { /* non-fatal */ }
      }
    }

    if (toAdd.length) {
      const newLineItems = await orderModule.createOrderLineItems(
        id,
        toAdd.map((item) => ({
          title: item.title,
          variant_id: item.variant_id ?? undefined,
          quantity: item.quantity ?? 1,
          unit_price: Math.round(item.unit_price ?? 0),
          metadata: item.metadata ?? {},
        }))
      )
      // Check if this is a pending order — if so, reserve the newly added items
      const orderStatus = await orderModule.retrieveOrder(id, { select: ["id", "status"] })
      if ((orderStatus as any).status === "pending") {
        await reserveInventoryForOrder(
          req.scope,
          (newLineItems as any[]).map((li, idx) => ({
            id: li.id,
            variant_id: toAdd[idx]?.variant_id ?? null,
            quantity: li.quantity,
          }))
        )
      }
    }
  }

  if (metadata) {
    const existing = await orderModule.retrieveOrder(id, { select: ["id", "metadata"] })
    const merged = { ...(existing.metadata ?? {}), ...metadata }
    await orderModule.updateOrders(id, { metadata: merged })
  }

  if (complete) {
    const orderForComplete = await orderModule.retrieveOrder(id, { relations: ["items"] })
    const completeMeta = (orderForComplete as any).metadata ?? {}

    if (!completeMeta.stock_deducted) {
      const inventoryModule = req.scope.resolve(Modules.INVENTORY)
      const lineItemIds = ((orderForComplete as any).items ?? []).map((i: any) => i.id).filter(Boolean)

      // Delete all reservations linked to this order's line items
      if (lineItemIds.length) {
        try {
          const reservations = await inventoryModule.listReservationItems({ line_item_id: lineItemIds })
          if (reservations.length) {
            await inventoryModule.deleteReservationItems((reservations as any[]).map((r) => r.id))
          }
        } catch { /* non-fatal */ }
      }

      // Deduct stocked_quantity for actual (picked = current line item) quantities
      await deductVariantStock(
        req.scope,
        ((orderForComplete as any).items ?? []).map((i: any) => ({
          variant_id: i.variant_id ?? null,
          quantity: i.quantity,
        }))
      )
      await orderModule.updateOrders(id, {
        metadata: { ...completeMeta, stock_deducted: true },
      })
    }
    await orderModule.completeOrder(id)
  }

  if (cancel) {
    const orderForCancel = await orderModule.retrieveOrder(id, { relations: ["items"] })
    const cancelMeta = (orderForCancel as any).metadata ?? {}

    // Cancel order — force-set status if already completed (sell mode)
    try {
      await (orderModule as any).cancelOrder(id)
    } catch {
      await orderModule.updateOrders(id, { status: "canceled" } as any)
    }

    // Return stock if it was deducted (sell mode cancellation)
    if (cancelMeta.stock_deducted && !cancelMeta.stock_returned) {
      await returnVariantStock(
        req.scope,
        ((orderForCancel as any).items ?? []).map((i: any) => ({
          variant_id: i.variant_id ?? null,
          quantity: i.quantity,
        }))
      )
      await orderModule.updateOrders(id, { metadata: { ...cancelMeta, stock_returned: true } })
    }

    // Release inventory reservations (order mode — stock not yet deducted)
    if (!cancelMeta.stock_deducted) {
      try {
        const inventoryModule = req.scope.resolve(Modules.INVENTORY)
        const lineItemIds = ((orderForCancel as any).items ?? []).map((i: any) => i.id).filter(Boolean)
        if (lineItemIds.length) {
          const reservations = await inventoryModule.listReservationItems({ line_item_id: lineItemIds })
          if (reservations.length) {
            await inventoryModule.deleteReservationItems((reservations as any[]).map((r) => r.id))
          }
        }
      } catch { /* non-fatal */ }
    }
  }

  if (archive) {
    await orderModule.updateOrders(id, { status: "archived" } as any)
  }

  if (mark_paid) {
    try {
      const { data: orders } = await (query.graph({
        entity: "order",
        fields: ["id", "total", "payment_collections.id", "payment_collections.status", "payment_collections.payments.id", "payment_collections.payments.amount"],
        filters: { id },
      }) as Promise<{ data: { id: string; total?: number; payment_collections?: { id: string; status: string; payments?: { id: string; amount?: number }[] }[] }[] }>)

      const orderData = orders?.[0]
      const existingCollection = orderData?.payment_collections?.find((pc) => pc.status !== "canceled")

      if (existingCollection?.status === "captured") {
        // Already paid — idempotent, nothing to do
      } else if (existingCollection?.status === "authorized") {
        // Storefront payment authorized by provider — capture it
        const authorizedAmount = (existingCollection.payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
        const paymentIds = (existingCollection.payments ?? []).map((p) => p.id).filter(Boolean)
        for (const paymentId of paymentIds) {
          await capturePaymentWorkflow(req.scope).run({ input: { payment_id: paymentId } })
        }
        // If order total exceeds captured amount (manager changed qty), cover remainder as manual payment
        const orderForTotal = await orderModule.retrieveOrder(id, { select: ["id", "total"] })
        const orderTotal = (orderForTotal as any).total ?? 0
        const remainder = orderTotal - authorizedAmount
        if (remainder > 0) {
          const { result: remainingCols } = await createOrderPaymentCollectionWorkflow(req.scope).run({
            input: { order_id: id, amount: remainder },
          })
          await markPaymentCollectionAsPaid(req.scope).run({
            input: { order_id: id, payment_collection_id: remainingCols[0].id },
          })
        }
      } else if (existingCollection) {
        // Manual/cash payment — mark collection as paid directly
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

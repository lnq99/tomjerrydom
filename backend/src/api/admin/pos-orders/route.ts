import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  markPaymentCollectionAsPaid,
} from "@medusajs/medusa/core-flows"

type PosItem = {
  variantId?: string
  title: string
  variantTitle?: string
  quantity: number
  unitPrice: number
  costPrice?: number
  thumbnail?: string | null
}

type CreatePosOrderBody = {
  items: PosItem[]
  total: number
  tierId?: string
  mode?: "sell" | "order"
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

    // Get first stock location
    const { data: locations } = await (query.graph({
      entity: "stock_location",
      fields: ["id"],
    }) as Promise<{ data: { id: string }[] }>)
    const locationId = locations?.[0]?.id
    if (!locationId) return

    // Get inventory items for each variant via the link entity
    const variantIds = withVariant.map((i) => i.variant_id!)
    const { data: links } = await (query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.id", "inventory_items.inventory_item_id"],
      filters: { id: variantIds },
    }) as Promise<{ data: { id: string; inventory_items?: { id: string; inventory_item_id?: string }[] }[] }>)

    // variantId → inventory item ID (try inventory_item_id first, fall back to id)
    const variantToInvItem = new Map<string, string>()
    for (const v of links ?? []) {
      const inv = v.inventory_items?.[0]
      const invId = inv?.inventory_item_id ?? inv?.id
      if (invId) variantToInvItem.set(v.id, invId)
    }
    if (!variantToInvItem.size) return

    // Get current levels at this location
    const invItemIds = [...variantToInvItem.values()]
    const levels = await inventoryModule.listInventoryLevels({
      inventory_item_id: invItemIds,
      location_id: locationId,
    })
    const levelMap = new Map<string, any>(levels.map((l: any) => [l.inventory_item_id, l]))

    // Build updates (deduct quantity, allow negative)
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
    // Non-fatal: order is created even if stock deduction fails
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { items, total, tierId, mode = "sell" } = req.body as CreatePosOrderBody

  if (!items?.length) {
    return res.status(400).json({ message: "Корзина пустая" })
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Resolve cost per item: use frontend-provided costPrice, fall back to product metadata
  const variantIdsNeedingCost = items.filter((i) => i.variantId && i.costPrice === undefined).map((i) => i.variantId!)
  const productCostMap: Record<string, number> = {}
  if (variantIdsNeedingCost.length) {
    const { data: variants } = await (query.graph({
      entity: "product_variant",
      fields: ["id", "product.metadata"],
      filters: { id: variantIdsNeedingCost },
    }) as Promise<{ data: { id: string; product?: { metadata?: Record<string, unknown> | null } | null }[] }>)
    for (const v of variants ?? []) {
      productCostMap[v.id] = Math.round((v.product?.metadata?.cost as number) ?? 0)
    }
  }

  const resolvedItems = items.map((item) => ({
    ...item,
    resolvedCost: item.costPrice ?? (item.variantId ? (productCostMap[item.variantId] ?? 0) : 0),
  }))

  const totalCost = resolvedItems.reduce((s, i) => s + i.resolvedCost * i.quantity, 0)

  const order = await orderModule.createOrders({
    currency_code: "rub",
    status: mode === "sell" ? "completed" : "pending",
    metadata: { source: "pos", tier_id: tierId ?? "retail", mode, total_cost: totalCost },
  })

  const totalRubles = Math.round(total / 100)

  await orderModule.createOrderLineItems(
    order.id,
    resolvedItems.map((item) => ({
      title: item.variantTitle
        ? `${item.title} — ${item.variantTitle}`
        : item.title,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price: Math.round(item.unitPrice / 100), // frontend sends kopecks; Medusa stores as-is in rubles
      thumbnail: item.thumbnail ?? undefined,
      metadata: { cost_price: item.resolvedCost }, // snapshot cost in kopecks
    }))
  )

  // For cash sales: capture payment and deduct stock
  if (mode === "sell") {
    try {
      const { result: paymentCollections } = await createOrderPaymentCollectionWorkflow(req.scope)
        .run({ input: { order_id: order.id, amount: totalRubles } })
      await markPaymentCollectionAsPaid(req.scope)
        .run({ input: { order_id: order.id, payment_collection_id: paymentCollections[0].id } })
    } catch {
      // Non-fatal
    }

    await deductVariantStock(
      req.scope,
      items.map((i) => ({ variant_id: i.variantId ?? null, quantity: i.quantity }))
    )
  }

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      total,
      created_at: order.created_at,
    },
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ message: "Missing order id" })

  const orderModule = req.scope.resolve(Modules.ORDER)
  await orderModule.cancel(id)

  res.json({ success: true })
}

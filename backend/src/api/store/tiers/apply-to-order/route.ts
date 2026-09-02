import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../_shared"

type Body = {
  order_id: string
  tier_id?: string
}

/**
 * POST /store/tiers/apply-to-order
 * Re-applies tier pricing to order line items after completeCartWorkflow
 * potentially overwrites them with Medusa catalog prices.
 * Also syncs the payment collection amount to the corrected order total.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { order_id, tier_id = "retail" } = req.body as Body

  if (!order_id) {
    return res.status(400).json({ message: "order_id is required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = req.scope.resolve(Modules.ORDER)
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any

  // Load order line items with variant info
  const order = await orderModule.retrieveOrder(order_id, { relations: ["items"] })
  const items = (order as any).items ?? []

  const variantIds: string[] = items.map((i: any) => i.variant_id).filter(Boolean)
  if (variantIds.length === 0) {
    return res.json({ updated: 0 })
  }

  // Fetch variants with product cost + category profit config
  const { data: variants } = await (query.graph({
    entity: "product_variant",
    fields: ["id", "product.metadata", "product.categories.metadata"],
    filters: { id: variantIds },
  }) as Promise<{ data: { id: string; product?: { metadata?: Record<string, unknown> | null; categories?: { metadata?: Record<string, unknown> | null }[] } | null }[] }>)

  const variantMap = new Map(variants.map((v) => [v.id, v]))

  // Build price corrections and compute new order total
  type PriceUpdate = { id: string; unit_price: number }
  const priceUpdates: PriceUpdate[] = []
  let newTotal = 0

  for (const item of items) {
    const variant = variantMap.get(item.variant_id)
    const qty: number = item.quantity ?? 1

    if (!variant) {
      newTotal += (item.unit_price ?? 0) * qty
      continue
    }

    const cost = (variant.product?.metadata as any)?.cost as number | undefined
    if (!cost) {
      newTotal += (item.unit_price ?? 0) * qty
      continue
    }

    const categories = (variant.product as any)?.categories ?? []
    const profit = getTierProfit(categories, tier_id)
    const tierPrice = calcPrice(cost, profit)
    newTotal += tierPrice * qty

    if (tierPrice !== item.unit_price) {
      priceUpdates.push({ id: item.id, unit_price: tierPrice })
    }
  }

  // Apply line item price corrections
  for (const upd of priceUpdates) {
    await orderModule.updateOrderLineItems(upd.id, { unit_price: upd.unit_price })
  }

  // Sync payment collection amount to the corrected order total
  if (priceUpdates.length > 0 && newTotal > 0) {
    try {
      const { data: orderData } = await (query.graph({
        entity: "order",
        fields: ["payment_collections.id", "payment_collections.status", "payment_collections.amount"],
        filters: { id: order_id },
      }) as Promise<{ data: { payment_collections?: { id: string; status: string; amount: number }[] }[] }>)

      const activeCollection = orderData[0]?.payment_collections?.find(
        (pc) => pc.status !== "canceled" && pc.status !== "captured"
      )

      if (activeCollection && activeCollection.amount !== newTotal) {
        await paymentModule.updatePaymentCollections(activeCollection.id, {
          amount: newTotal,
        })
      }
    } catch (e) {
      // Payment collection sync is best-effort — line items are already corrected
      console.error("apply-to-order: failed to sync payment collection amount:", e)
    }
  }

  res.json({ updated: priceUpdates.length })
}

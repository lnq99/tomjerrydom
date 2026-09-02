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
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { order_id, tier_id = "retail" } = req.body as Body

  if (!order_id) {
    return res.status(400).json({ message: "order_id is required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = req.scope.resolve(Modules.ORDER)

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

  let updated = 0
  for (const item of items) {
    const variant = variantMap.get(item.variant_id)
    if (!variant) continue

    const cost = (variant.product?.metadata as any)?.cost as number | undefined
    if (!cost) continue

    const categories = (variant.product as any)?.categories ?? []
    const profit = getTierProfit(categories, tier_id)
    const tierPrice = calcPrice(cost, profit)

    if (tierPrice !== item.unit_price) {
      await orderModule.updateOrderLineItems(item.id, { unit_price: tierPrice })
      updated++
    }
  }

  res.json({ updated })
}

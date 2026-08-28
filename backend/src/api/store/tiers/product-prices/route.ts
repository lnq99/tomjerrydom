import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../_shared"

/**
 * GET /store/tiers/product-prices
 * Query: tier_id (string), product_ids[] (string[])
 * Returns: { prices: { [variantId]: number } }
 *   - positive number: computed price in kopecks (cost × margin)
 *   - 0: product has no cost set — caller should suppress any price display
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tier_id = req.query.tier_id as string | undefined
  // qs strips [] suffix: product_ids[]=a&product_ids[]=b → { product_ids: ['a','b'] }
  const raw = req.query["product_ids"]
  const productIds: string[] = Array.isArray(raw)
    ? (raw as string[])
    : raw
      ? [raw as string]
      : []

  if (!tier_id || productIds.length === 0) {
    return res.json({ prices: {} })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "variants.id", "categories.metadata"],
    filters: { id: productIds },
  })

  const prices: Record<string, number> = {}

  for (const product of products) {
    const cost: number | undefined = (product.metadata as any)?.cost
    const variants = (product as any).variants ?? []

    if (!cost) {
      // No cost set: mark all variants with 0 so the storefront suppresses
      // any stale Medusa catalog price rather than falling back to it.
      for (const variant of variants) {
        if (variant?.id) prices[variant.id] = 0
      }
      continue
    }

    const categories = (product as any).categories ?? []
    const profit = getTierProfit(categories, tier_id)
    const price = calcPrice(cost, profit)

    for (const variant of variants) {
      if (variant?.id) prices[variant.id] = price
    }
  }

  res.json({ prices })
}

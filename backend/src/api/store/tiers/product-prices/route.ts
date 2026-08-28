import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../_shared"

/**
 * GET /store/tiers/product-prices
 * Query: tier_id (string), product_ids[] (string[])
 * Returns: { prices: { [variantId]: number } } — amounts in smallest currency unit (kopecks)
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

  if (!tier_id || tier_id === "retail" || productIds.length === 0) {
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
    if (!cost) continue

    const categories = (product as any).categories ?? []
    const profit = getTierProfit(categories, tier_id)
    const price = calcPrice(cost, profit)

    for (const variant of (product as any).variants ?? []) {
      if (variant?.id) {
        prices[variant.id] = price
      }
    }
  }

  res.json({ prices })
}

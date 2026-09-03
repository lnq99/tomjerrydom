import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../_shared"
import { TIERS } from "../../../../data/tiersConfig"

/**
 * GET /store/tiers/all-product-prices
 * Query: product_ids[] (string[])
 * Returns prices for ALL tiers at once so the storefront can switch client-side.
 * { prices: { [tierId]: { [variantId]: number } } }
 * variantId → 0 means no cost set (suppress price display)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = req.query["product_ids"]
  const productIds: string[] = Array.isArray(raw)
    ? (raw as string[])
    : raw
      ? [raw as string]
      : []

  if (productIds.length === 0) {
    return res.json({ prices: {} })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "variants.id", "categories.metadata"],
    filters: { id: productIds },
  })

  const allPrices: Record<string, Record<string, number>> = {}
  for (const tier of TIERS) {
    allPrices[tier.id] = {}
  }

  for (const product of products) {
    const cost: number | undefined = (product.metadata as any)?.cost
    const variants = (product as any).variants ?? []
    const categories = (product as any).categories ?? []

    for (const tier of TIERS) {
      for (const variant of variants) {
        if (!variant?.id) continue
        if (!cost) {
          allPrices[tier.id][variant.id] = 0
        } else {
          const profit = getTierProfit(categories, tier.id)
          allPrices[tier.id][variant.id] = calcPrice(cost, profit)
        }
      }
    }
  }

  res.json({ prices: allPrices })
}

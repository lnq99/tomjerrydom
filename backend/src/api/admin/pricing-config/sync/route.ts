import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../../../store/tiers/_shared"

/**
 * POST /admin/pricing-config/sync
 * Recalculates retail prices for all products that have a capital set,
 * and writes them to the default (non-price-list) RUB price in Medusa.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const pricingService = req.scope.resolve(Modules.PRICING)

  // Fetch all variants with product capital + category profit config + existing prices
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product.metadata",
      "product.categories.metadata",
      "price_set.id",
      "price_set.prices.id",
      "price_set.prices.currency_code",
      "price_set.prices.price_list_id",
    ],
  })

  const toRemove: string[] = []
  const toAdd: { priceSetId: string; prices: { amount: number; currency_code: string }[] }[] = []
  let skipped = 0

  for (const variant of variants as any[]) {
    const capital: number = variant.product?.metadata?.capital
    if (!capital) { skipped++; continue }

    const categories = variant.product?.categories ?? []
    const profit = getTierProfit(categories, "retail")
    const retailPrice = calcPrice(capital, profit)

    const priceSet = variant.price_set
    if (!priceSet) { skipped++; continue }

    const existing = (priceSet.prices ?? []).find(
      (p: any) => p.currency_code === "rub" && !p.price_list_id
    )

    if (existing) {
      toRemove.push(existing.id)
    }
    toAdd.push({ priceSetId: priceSet.id, prices: [{ amount: retailPrice, currency_code: "rub" }] })
  }

  if (toRemove.length > 0) {
    await pricingService.removePrices(toRemove)
  }

  if (toAdd.length > 0) {
    await Promise.all(
      toAdd.map((entry) =>
        pricingService.addPrices([{ priceSetId: entry.priceSetId, prices: entry.prices }])
      )
    )
  }

  res.json({
    ok: true,
    updated: toRemove.length,
    created: toAdd.length - toRemove.length,
    skipped,
  })
}

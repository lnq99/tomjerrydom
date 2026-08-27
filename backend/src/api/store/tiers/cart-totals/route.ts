import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deriveTierKey, getTierProfit, calcPrice } from "../_shared"

type CartTotalsBody = { cart_id: string }

export async function POST(
  req: MedusaRequest<CartTotalsBody>,
  res: MedusaResponse
) {
  const { cart_id } = req.body as CartTotalsBody

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id is required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const pricingService = req.scope.resolve(Modules.PRICING)

  const { data: [cart] } = await query.graph({
    entity: "cart",
    fields: ["id", "items.variant_id", "items.quantity", "items.unit_price"],
    filters: { id: [cart_id] },
  })

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  const items = (cart as any).items ?? []
  const variantIds: string[] = items.map((i: any) => i.variant_id).filter(Boolean)

  // Fetch tier list (keep price list ID for fallback price lookup)
  const priceLists = await pricingService.listPriceLists(
    { status: ["active"] },
    { select: ["id", "title", "metadata"] }
  )

  const tierDefs = [
    { id: "retail", label: "Розница", min_order_amount: 0, sort_order: 0, priceListId: null as string | null },
    ...priceLists
      .filter((pl) => pl.metadata?.is_tier === true)
      .map((pl) => ({
        id: deriveTierKey(pl.metadata as Record<string, unknown>),
        label: (pl.metadata?.label as string) ?? pl.title,
        min_order_amount: ((pl.metadata?.min_order_amount as number) ?? 0) * 100,
        sort_order: (pl.metadata?.sort_order as number) ?? 99,
        priceListId: pl.id,
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  ]

  if (variantIds.length === 0) {
    return res.json({
      note: "item subtotal only — excludes shipping and tax",
      tiers: tierDefs.map((t) => ({ ...t, subtotal: 0 })),
    })
  }

  // Fetch variants with capital + category profit config + price set prices for fallback
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product.metadata",
      "product.categories.metadata",
      "price_set.prices.amount",
      "price_set.prices.currency_code",
      "price_set.prices.price_list_id",
    ],
    filters: { id: variantIds },
  })

  const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]))

  // Build a lookup: priceListId → variantId → price (first RUB price found)
  const plPriceMap = new Map<string, Map<string, number>>()
  for (const variant of variants as any[]) {
    const prices: any[] = variant.price_set?.prices ?? []
    for (const price of prices) {
      if (!price.price_list_id) continue
      if (price.currency_code && price.currency_code.toLowerCase() !== "rub") continue
      if (!plPriceMap.has(price.price_list_id)) {
        plPriceMap.set(price.price_list_id, new Map())
      }
      const byVariant = plPriceMap.get(price.price_list_id)!
      if (!byVariant.has(variant.id)) {
        byVariant.set(variant.id, price.amount)
      }
    }
  }

  const tierTotals = tierDefs.map((tier) => {
    const plVariantPrices = tier.priceListId ? plPriceMap.get(tier.priceListId) : undefined
    let subtotal = 0
    for (const item of items) {
      const variant = variantMap.get(item.variant_id)
      const capital: number | undefined = variant
        ? (variant.product?.metadata as any)?.capital
        : undefined
      if (capital) {
        const categories = variant.product?.categories ?? []
        const profit = getTierProfit(categories, tier.id)
        subtotal += calcPrice(capital, profit) * item.quantity
      } else {
        // No capital — use price list price for this tier if available, else current unit_price
        const plPrice = plVariantPrices?.get(item.variant_id)
        subtotal += (plPrice ?? item.unit_price ?? 0) * item.quantity
      }
    }
    return { id: tier.id, label: tier.label, min_order_amount: tier.min_order_amount, subtotal }
  })

  res.json({ note: "item subtotal only — excludes shipping and tax", tiers: tierTotals })
}

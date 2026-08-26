import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type CartTotalsBody = { cart_id: string }

type VariantPriceEntry = {
  id: string
  price_set: {
    prices: { amount: number; currency_code: string; price_list_id: string | null }[]
  } | null
}

function pickPrice(
  variant: VariantPriceEntry,
  tierId: string,
  currencyCode: string
): number | null {
  const prices = variant.price_set?.prices ?? []
  const isRetail = tierId === "retail"
  const match = prices.find(
    (p) =>
      p.currency_code.toLowerCase() === currencyCode.toLowerCase() &&
      (isRetail ? p.price_list_id == null : p.price_list_id === tierId)
  )
  return match?.amount ?? null
}

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

  // Load cart items
  const { data: [cart] } = await query.graph({
    entity: "cart",
    fields: ["id", "currency_code", "items.variant_id", "items.quantity"],
    filters: { id: [cart_id] },
  })

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  const items = (cart as any).items ?? []
  const currencyCode = (cart as any).currency_code ?? "rub"
  const variantIds: string[] = items.map((i: any) => i.variant_id).filter(Boolean)

  if (variantIds.length === 0) {
    return res.json({ note: "item subtotal only — excludes shipping and tax", tiers: [] })
  }

  // Fetch variant prices (all price lists)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "price_set.prices.amount",
      "price_set.prices.currency_code",
      "price_set.prices.price_list_id",
    ],
    filters: { id: variantIds },
  }) as { data: VariantPriceEntry[] }

  const variantPriceMap = new Map<string, VariantPriceEntry>(
    variants.map((v) => [v.id, v])
  )

  // Fetch all active tier price lists
  const priceLists = await pricingService.listPriceLists(
    { status: ["active"] },
    { select: ["id", "title", "metadata"] }
  )

  const tierLists = [
    { id: "retail", label: "Розница", min_order_amount: 0, price_list_id: null as string | null, sort_order: 0 },
    ...priceLists
      .filter((pl) => pl.metadata?.is_tier === true)
      .map((pl) => ({
        id: pl.id,
        label: (pl.metadata?.label as string) ?? pl.title,
        min_order_amount: ((pl.metadata?.min_order_amount as number) ?? 0) * 100,
        price_list_id: pl.id as string | null,
        sort_order: (pl.metadata?.sort_order as number) ?? 99,
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  ]

  // Calculate subtotal per tier
  const tierTotals = tierLists.map((tier) => {
    let subtotal = 0
    for (const item of items) {
      const variant = variantPriceMap.get(item.variant_id)
      if (!variant) continue
      const price = pickPrice(variant, tier.id, currencyCode)
      if (price !== null) {
        subtotal += price * item.quantity
      }
    }
    return {
      id: tier.id,
      label: tier.label,
      min_order_amount: tier.min_order_amount,
      subtotal,
    }
  })

  res.json({
    note: "item subtotal only — excludes shipping and tax",
    tiers: tierTotals,
  })
}

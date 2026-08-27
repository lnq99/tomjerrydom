import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deriveTierKey, getTierProfit, calcPrice, DEFAULT_TIER_PROFIT } from "../_shared"

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

  // Fetch tier list
  const priceLists = await pricingService.listPriceLists(
    { status: ["active"] },
    { select: ["id", "title", "metadata"] }
  )

  const tierDefs = [
    { id: "retail", label: "Розница", min_order_amount: 0, sort_order: 0 },
    ...priceLists
      .filter((pl) => pl.metadata?.is_tier === true)
      .map((pl) => ({
        id: deriveTierKey(pl.metadata as Record<string, unknown>),
        label: (pl.metadata?.label as string) ?? pl.title,
        min_order_amount: ((pl.metadata?.min_order_amount as number) ?? 0) * 100,
        sort_order: (pl.metadata?.sort_order as number) ?? 99,
      }))
      .sort((a, b) => a.sort_order - b.sort_order),
  ]

  if (variantIds.length === 0) {
    return res.json({
      note: "item subtotal only — excludes shipping and tax",
      tiers: tierDefs.map((t) => ({ ...t, subtotal: 0 })),
    })
  }

  // Fetch variants with capital + category profit config
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product.metadata",
      "product.categories.metadata",
    ],
    filters: { id: variantIds },
  })

  const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]))

  const tierTotals = tierDefs.map((tier) => {
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
        // No capital set — price doesn't vary by tier, use current unit_price
        subtotal += (item.unit_price ?? 0) * item.quantity
      }
    }
    return { id: tier.id, label: tier.label, min_order_amount: tier.min_order_amount, subtotal }
  })

  res.json({ note: "item subtotal only — excludes shipping and tax", tiers: tierTotals })
}

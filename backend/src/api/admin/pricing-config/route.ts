import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deriveTierKey, DEFAULT_TIER_PROFIT, calcPrice } from "../../store/tiers/_shared"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const pricingService = req.scope.resolve(Modules.PRICING)

  // Load tiers from price lists
  const priceLists = await pricingService.listPriceLists(
    { status: ["active"] },
    { select: ["id", "title", "metadata"] }
  )

  const tiers = [
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

  // Load categories with tier_profit metadata
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "metadata"],
  })

  // Load products with cost + category info
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "metadata", "categories.id", "categories.name"],
  })

  const categoryTierIds = tiers.map((t) => t.id)

  const formattedCategories = (categories as any[]).map((cat) => {
    const tierProfit: Record<string, number> = {}
    for (const tierId of categoryTierIds) {
      const configured = (cat.metadata as any)?.tier_profit?.[tierId]
      tierProfit[tierId] = typeof configured === "number" ? configured : DEFAULT_TIER_PROFIT[tierId] ?? 30
    }
    return { id: cat.id, name: cat.name, tier_profit: tierProfit }
  })

  const formattedProducts = (products as any[]).map((prod) => {
    const cost: number = (prod.metadata as any)?.cost ?? 0
    const categoryId = prod.categories?.[0]?.id ?? null
    const categoryName = prod.categories?.[0]?.name ?? null

    // Find category tier_profit for price preview
    const cat = formattedCategories.find((c) => c.id === categoryId)
    const calculated: Record<string, number> = {}
    if (cost > 0) {
      for (const tier of tiers) {
        const profit = cat?.tier_profit?.[tier.id] ?? DEFAULT_TIER_PROFIT[tier.id] ?? 30
        calculated[tier.id] = calcPrice(cost, profit)
      }
    }

    return {
      id: prod.id,
      title: prod.title,
      thumbnail: prod.thumbnail ?? null,
      cost,
      category_id: categoryId,
      category_name: categoryName,
      calculated_prices: calculated,
    }
  })

  res.json({
    tiers,
    default_profit: DEFAULT_TIER_PROFIT,
    categories: formattedCategories,
    products: formattedProducts,
  })
}

type CategoryUpdate = {
  category_id: string
  tier_profit: Record<string, number>
}

export async function POST(
  req: MedusaRequest<{ updates: CategoryUpdate[] }>,
  res: MedusaResponse
) {
  const { updates } = req.body as { updates: CategoryUpdate[] }
  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "updates array is required" })
  }

  const productCategoryService = req.scope.resolve(Modules.PRODUCT)

  await Promise.all(
    updates.map((u) =>
      (productCategoryService as any).updateProductCategories(u.category_id, {
        metadata: { tier_profit: u.tier_profit },
      })
    )
  )

  res.json({ ok: true })
}

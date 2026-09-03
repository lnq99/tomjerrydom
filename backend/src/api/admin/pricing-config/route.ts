import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { DEFAULT_TIER_PROFIT, calcPrice } from "../../store/tiers/_shared"
import { TIERS } from "../../../data/tiersConfig"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const tiers = TIERS.map((t) => ({ id: t.id, label: t.label, min_order_amount: t.min_order_amount, sort_order: t.sort_order }))

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

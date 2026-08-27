import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../_shared"

type ApplyBody = {
  cart_id: string
  tier_id: string // "retail" | "wholesale20" | "wholesale50"
}

export async function POST(
  req: MedusaRequest<ApplyBody>,
  res: MedusaResponse
) {
  const { cart_id, tier_id } = req.body as ApplyBody

  if (!cart_id || !tier_id) {
    return res.status(400).json({ message: "cart_id and tier_id are required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const cartService = req.scope.resolve(Modules.CART)

  // Load cart with line items
  const { data: [cart] } = await query.graph({
    entity: "cart",
    fields: ["id", "items.id", "items.variant_id", "items.quantity"],
    filters: { id: [cart_id] },
  })

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  const items = (cart as any).items ?? []
  const variantIds: string[] = items.map((i: any) => i.variant_id).filter(Boolean)

  if (variantIds.length === 0) {
    return res.json({ cart })
  }

  // Fetch variants with product capital + category profit config
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

  const updates: { id: string; unit_price: number }[] = []
  for (const item of items) {
    const variant = variantMap.get(item.variant_id)
    if (!variant) continue

    const capital: number = (variant.product?.metadata as any)?.capital
    if (!capital) continue

    const categories = variant.product?.categories ?? []
    const profit = getTierProfit(categories, tier_id)
    const price = calcPrice(capital, profit)

    updates.push({ id: item.id, unit_price: price })
  }

  if (updates.length > 0) {
    await cartService.updateLineItems(updates)
  }

  const { data: [updatedCart] } = await query.graph({
    entity: "cart",
    fields: [
      "id", "currency_code", "total", "subtotal", "item_subtotal",
      "items.id", "items.variant_id", "items.quantity", "items.unit_price", "items.total",
    ],
    filters: { id: [cart_id] },
  })

  res.json({ cart: updatedCart })
}

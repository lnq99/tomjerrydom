import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getTierProfit, calcPrice } from "../_shared"
import { TIERS } from "../../../../data/tiersConfig"

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

  if (variantIds.length === 0) {
    return res.json({
      note: "item subtotal only — excludes shipping and tax",
      tiers: TIERS.map((t) => ({ id: t.id, label: t.label, min_order_amount: t.min_order_amount, subtotal: 0 })),
    })
  }

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

  const tierTotals = TIERS.map((tier) => {
    let subtotal = 0
    for (const item of items) {
      const variant = variantMap.get(item.variant_id)
      const cost: number | undefined = variant
        ? (variant.product?.metadata as any)?.cost
        : undefined
      if (cost) {
        const categories = variant.product?.categories ?? []
        const profit = getTierProfit(categories, tier.id)
        subtotal += calcPrice(cost, profit) * item.quantity
      } else {
        subtotal += (item.unit_price ?? 0) * item.quantity
      }
    }
    return { id: tier.id, label: tier.label, min_order_amount: tier.min_order_amount, subtotal }
  })

  res.json({ note: "item subtotal only — excludes shipping and tax", tiers: tierTotals })
}

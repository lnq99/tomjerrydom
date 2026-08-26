import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type ApplyBody = {
  cart_id: string
  tier_id: string // "retail" or a price list ID
}

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
    fields: ["id", "currency_code", "items.id", "items.variant_id", "items.quantity"],
    filters: { id: [cart_id] },
  })

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  const items = (cart as any).items ?? []
  const variantIds: string[] = items
    .map((i: any) => i.variant_id)
    .filter(Boolean)

  if (variantIds.length === 0) {
    return res.json({ cart })
  }

  // Fetch variant → price_set → prices
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

  const currencyCode = (cart as any).currency_code ?? "rub"

  // Build updates: one per line item that has a price at the target tier
  const updates: { id: string; unit_price: number }[] = []
  for (const item of items) {
    const variant = variantPriceMap.get(item.variant_id)
    if (!variant) continue
    const price = pickPrice(variant, tier_id, currencyCode)
    if (price !== null) {
      updates.push({ id: item.id, unit_price: price })
    }
  }

  // Apply unit_price updates via cart module service
  if (updates.length > 0) {
    await cartService.updateLineItems(updates)
  }

  // Return the refreshed cart
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

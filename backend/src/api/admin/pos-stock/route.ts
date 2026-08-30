import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, getTotalVariantAvailability } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = req.query["variant_id"]
  const variantIds = (Array.isArray(raw) ? raw : raw ? [raw] : []) as string[]

  if (!variantIds.length) {
    return res.json({ stock: {}, inventory_item_ids: {} })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const [availability, variantResult] = await Promise.all([
    getTotalVariantAvailability(query, { variant_ids: variantIds }),
    query.graph({
      entity: "product_variant",
      fields: ["id", "*inventory_items"],
      filters: { id: variantIds },
    }),
  ])

  const stock: Record<string, number | null> = {}
  for (const [id, data] of Object.entries(availability)) {
    stock[id] = data.availability
  }

  // inventory_items on a variant traverses the remote link to InventoryItem;
  // the first item's .id is the inventory_item_id needed for location-level updates.
  const inventory_item_ids: Record<string, string | null> = {}
  for (const variant of (variantResult.data as any[]) ?? []) {
    inventory_item_ids[variant.id] = variant.inventory_items?.[0]?.id ?? null
  }

  res.json({ stock, inventory_item_ids })
}

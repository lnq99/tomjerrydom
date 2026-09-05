import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = req.query["variant_id"]
  const variantIds = (Array.isArray(raw) ? raw : raw ? [raw] : []) as string[]
  const explicitLocationId = (req.query["location_id"] as string | undefined) ?? null

  if (!variantIds.length) {
    return res.json({ stock: {}, inventory_item_ids: {}, location_ids: {} })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryModule = req.scope.resolve(Modules.INVENTORY)

  const { data: variants } = await (query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.id", "inventory_items.inventory_item_id"],
    filters: { id: variantIds },
  }) as unknown as Promise<{ data: { id: string; inventory_items?: { id: string; inventory_item_id?: string }[] }[] }>)

  const inventory_item_ids: Record<string, string | null> = {}
  const invItemToVariant = new Map<string, string>()

  for (const variant of variants ?? []) {
    const inv = variant.inventory_items?.[0]
    // inventory_item_id is the actual InventoryItem ID; .id is the link record ID
    const invId = inv?.inventory_item_id ?? inv?.id ?? null
    inventory_item_ids[variant.id] = invId
    if (invId) invItemToVariant.set(invId, variant.id)
  }

  const stock: Record<string, number | null> = {}
  const location_ids: Record<string, string | null> = {}
  for (const id of variantIds) { stock[id] = null; location_ids[id] = null }

  if (invItemToVariant.size) {
    const filter: Record<string, any> = { inventory_item_id: [...invItemToVariant.keys()] }
    if (explicitLocationId) filter.location_id = explicitLocationId

    const levels = await inventoryModule.listInventoryLevels(filter)

    // Sum across all matching levels; track winning location per variant
    const bestLevel = new Map<string, { qty: number; locationId: string }>()
    for (const level of levels as any[]) {
      const variantId = invItemToVariant.get(level.inventory_item_id)
      if (variantId === undefined) continue
      const qty = level.stocked_quantity ?? 0
      const prev = bestLevel.get(variantId)
      if (!prev || qty > prev.qty) {
        bestLevel.set(variantId, { qty, locationId: level.location_id })
      }
      stock[variantId] = (stock[variantId] ?? 0) + qty
    }
    for (const [variantId, { locationId }] of bestLevel) {
      location_ids[variantId] = locationId
    }
  }

  res.json({ stock, inventory_item_ids, location_ids })
}

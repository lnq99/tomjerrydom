import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, getTotalVariantAvailability } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = req.query["variant_id"]
  const variantIds = (Array.isArray(raw) ? raw : raw ? [raw] : []) as string[]

  if (!variantIds.length) {
    return res.json({ stock: {} })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const availability = await getTotalVariantAvailability(query, { variant_ids: variantIds })

  // availability: { [variantId]: { availability: number | null } }
  const stock: Record<string, number | null> = {}
  for (const [id, data] of Object.entries(availability)) {
    stock[id] = data.availability
  }

  res.json({ stock })
}

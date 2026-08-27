import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type ProductCostUpdate = {
  product_id: string
  /** cost in kopecks */
  cost: number
}

export async function POST(
  req: MedusaRequest<{ updates: ProductCostUpdate[] }>,
  res: MedusaResponse
) {
  const { updates } = req.body as { updates: ProductCostUpdate[] }
  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "updates array is required" })
  }

  const productService = req.scope.resolve(Modules.PRODUCT)

  await Promise.all(
    updates.map((u) =>
      (productService as any).updateProducts(u.product_id, {
        metadata: { cost: Math.round(u.cost) },
      })
    )
  )

  res.json({ ok: true })
}

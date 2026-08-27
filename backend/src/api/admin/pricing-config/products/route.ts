import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type ProductCapitalUpdate = {
  product_id: string
  /** capital in kopecks */
  capital: number
}

export async function POST(
  req: MedusaRequest<{ updates: ProductCapitalUpdate[] }>,
  res: MedusaResponse
) {
  const { updates } = req.body as { updates: ProductCapitalUpdate[] }
  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "updates array is required" })
  }

  const productService = req.scope.resolve(Modules.PRODUCT)

  await Promise.all(
    updates.map((u) =>
      (productService as any).updateProducts(u.product_id, {
        metadata: { capital: Math.round(u.capital) },
      })
    )
  )

  res.json({ ok: true })
}

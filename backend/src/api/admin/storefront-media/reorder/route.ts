import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MEDIA_MODULE } from "../../../../modules/storefront-media"
import StorefrontMediaService from "../../../../modules/storefront-media/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const { items } = req.body as { items: Array<{ id: string; position: number }> }

  if (!Array.isArray(items)) {
    return res.status(400).json({ message: "items array is required" })
  }

  await Promise.all(
    items.map(({ id, position }) => (service as any).updateStorefrontMediaItems(id, { position }))
  )

  res.json({ ok: true })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MEDIA_MODULE } from "../../../../modules/storefront-media"
import StorefrontMediaService from "../../../../modules/storefront-media/service"

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const { id } = req.params
  const body = req.body as { url?: string; title?: string | null; position?: number }

  const item = await service.updateStorefrontMediaItems(id, body)
  res.json({ item })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const { id } = req.params

  await service.deleteStorefrontMediaItems(id)
  res.json({ id, deleted: true })
}

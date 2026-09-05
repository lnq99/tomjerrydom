import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteFilesWorkflow } from "@medusajs/medusa/core-flows"
import { STOREFRONT_MEDIA_MODULE } from "../../../../modules/storefront-media"
import StorefrontMediaService from "../../../../modules/storefront-media/service"

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const { id } = req.params
  const body = req.body as { url?: string; title?: string | null; position?: number }

  const item = await (service as any).updateStorefrontMediaItems(id, body)
  res.json({ item })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const { id } = req.params

  const item = await service.retrieveStorefrontMediaItem(id)

  // Delete the file from R2 (or local disk) if it was uploaded via the manager
  if (item.medusa_file_id) {
    try {
      await deleteFilesWorkflow(req.scope).run({ input: { ids: [item.medusa_file_id] } })
    } catch (e) {
      // Log but don't block — file may already be gone; DB record must still be removed
      req.scope.resolve("logger")?.warn?.(`Could not delete file ${item.medusa_file_id} from storage: ${e}`)
    }
  }

  await service.deleteStorefrontMediaItems(id)
  res.json({ id, deleted: true })
}

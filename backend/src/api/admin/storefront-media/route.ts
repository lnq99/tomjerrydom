import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MEDIA_MODULE } from "../../../modules/storefront-media"
import StorefrontMediaService from "../../../modules/storefront-media/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const section = req.query.section as string | undefined

  const filters = section ? { section } : {}
  const items = await service.listStorefrontMediaItems(filters, {
    order: { section: "ASC", position: "ASC" },
  })

  res.json({ items })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)
  const body = req.body as {
    section: string
    type: string
    url: string
    title?: string | null
    position?: number
  }

  if (!body.section || !body.type || !body.url) {
    return res.status(400).json({ message: "section, type, and url are required" })
  }

  // Append after last item in this section by default
  if (body.position === undefined) {
    const existing = await service.listStorefrontMediaItems(
      { section: body.section },
      { order: { position: "DESC" }, take: 1 }
    )
    body.position = existing.length > 0 ? (existing[0].position as number) + 1 : 0
  }

  const item = await service.createStorefrontMediaItems({
    section: body.section,
    type: body.type,
    url: body.url,
    title: body.title ?? null,
    position: body.position,
  })

  res.status(201).json({ item })
}

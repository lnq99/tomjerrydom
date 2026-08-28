import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MEDIA_MODULE } from "../../../modules/storefront-media"
import StorefrontMediaService from "../../../modules/storefront-media/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<StorefrontMediaService>(STOREFRONT_MEDIA_MODULE)

  const [heroItems, reelItems] = await Promise.all([
    service.listStorefrontMediaItems({ section: "hero" }, { order: { position: "ASC" } }),
    service.listStorefrontMediaItems({ section: "reels" }, { order: { position: "ASC" } }),
  ])

  res.json({
    hero: heroItems.map((i) => ({ id: i.id, type: i.type, url: i.url, title: i.title })),
    reels: reelItems.map((i) => ({ id: i.id, url: i.url, title: i.title })),
  })
}

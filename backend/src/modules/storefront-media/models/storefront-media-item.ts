import { model } from "@medusajs/framework/utils"

const StorefrontMediaItem = model.define("storefront_media_item", {
  id: model.id().primaryKey(),
  section: model.text(),        // "hero" | "reels"
  type: model.text(),           // "video" | "image"
  url: model.text(),
  title: model.text().nullable(),
  position: model.number().default(0),
})

export default StorefrontMediaItem

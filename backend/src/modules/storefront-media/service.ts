import { MedusaService } from "@medusajs/framework/utils"
import StorefrontMediaItem from "./models/storefront-media-item"

class StorefrontMediaService extends MedusaService({
  StorefrontMediaItem,
}) {}

export default StorefrontMediaService

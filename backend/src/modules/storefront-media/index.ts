import { Module } from "@medusajs/framework/utils"
import StorefrontMediaService from "./service"

export const STOREFRONT_MEDIA_MODULE = "storefrontMedia"

export default Module(STOREFRONT_MEDIA_MODULE, {
  service: StorefrontMediaService,
})

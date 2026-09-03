import { Module } from "@medusajs/framework/utils"
import ProductArticleService from "./service"

export const PRODUCT_ARTICLE_MODULE = "productArticle"

export default Module(PRODUCT_ARTICLE_MODULE, {
  service: ProductArticleService,
})

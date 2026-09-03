import { model } from "@medusajs/framework/utils"

const ProductArticle = model.define("product_article", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  title: model.text().nullable(),
  content: model.text(),
})

export default ProductArticle

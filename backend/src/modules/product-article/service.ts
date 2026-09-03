import { MedusaService } from "@medusajs/framework/utils"
import ProductArticle from "./models/product-article"

class ProductArticleService extends MedusaService({
  ProductArticle,
}) {}

export default ProductArticleService

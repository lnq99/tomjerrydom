import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_ARTICLE_MODULE } from "../../../../modules/product-article"
import ProductArticleService from "../../../../modules/product-article/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { productId } = req.params
  const service = req.scope.resolve<ProductArticleService>(PRODUCT_ARTICLE_MODULE)

  const articles = await service.listProductArticles({ product_id: productId })
  res.json({ article: articles[0] ?? null })
}

export async function POST(
  req: MedusaRequest<{ title?: string | null; content: string }>,
  res: MedusaResponse
) {
  const { productId } = req.params
  const service = req.scope.resolve<ProductArticleService>(PRODUCT_ARTICLE_MODULE)
  const { title, content } = req.body as { title?: string | null; content: string }

  if (!content) {
    return res.status(400).json({ message: "content is required" })
  }

  const existing = await service.listProductArticles({ product_id: productId })

  let article
  if (existing[0]) {
    const updated = await service.updateProductArticles([{ id: existing[0].id, title: title ?? null, content }])
    article = updated[0]
  } else {
    article = await service.createProductArticles({
      product_id: productId,
      title: title ?? null,
      content,
    })
  }

  res.json({ article })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { productId } = req.params
  const service = req.scope.resolve<ProductArticleService>(PRODUCT_ARTICLE_MODULE)

  const existing = await service.listProductArticles({ product_id: productId })
  if (existing[0]) {
    await service.deleteProductArticles(existing[0].id)
  }

  res.json({ ok: true })
}

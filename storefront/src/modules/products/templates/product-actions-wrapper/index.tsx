import { listProducts } from "@lib/data/products"
import { getTierId } from "@lib/data/cookies"
import { getTierProductPrices } from "@lib/data/tiers"
import { applyTierPrices } from "@lib/util/tier-prices"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const tierId = await getTierId()
  const tierPrices = await getTierProductPrices(tierId, [product.id!])
  const [pricedProduct] = applyTierPrices([product], tierPrices)

  return <ProductActions product={pricedProduct} region={region} />
}

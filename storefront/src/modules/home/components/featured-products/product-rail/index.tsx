import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

export default async function ProductRail({
  collection,
  region,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
      limit: 8,
    },
  })

  if (!pricedProducts || pricedProducts.length === 0) {
    return null
  }

  return (
    <div className="py-8 small:py-14">
      <div className="content-container flex items-baseline justify-between mb-5">
        <h2 className="text-xl small:text-2xl font-bold text-ui-fg-base">
          {collection.title}
        </h2>
        <LocalizedClientLink
          href={`/collections/${collection.handle}`}
          className="text-sm text-ui-fg-muted hover:text-ui-fg-base transition-colors whitespace-nowrap"
        >
          Смотреть все →
        </LocalizedClientLink>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <ul className="flex gap-4 px-4 small:px-8 small:grid small:grid-cols-4 medium:grid-cols-5 large:grid-cols-6 small:gap-6">
          {pricedProducts.map((product) => (
            <li key={product.id} className="shrink-0 w-40 small:w-auto">
              <ProductPreview product={product} region={region} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

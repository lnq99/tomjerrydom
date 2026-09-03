import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getAllTierProductPrices } from "@lib/data/tiers"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { applyTierPrices, hasSellingPrice } from "@lib/util/tier-prices"
import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

function normalizeSearch(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/g, "")
}

function matchesSearch(product: HttpTypes.StoreProduct, query: string): boolean {
  const brand = typeof product.subtitle === "string" ? product.subtitle : ""
  const title = typeof product.title === "string" ? product.title : ""
  const haystack = normalizeSearch(brand + title)
  const needle = normalizeSearch(query)
  return needle.length === 0 || haystack.includes(needle)
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  searchQuery,
  view,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  searchQuery?: string
  view?: "grid" | "list"
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  const productIds = products.map((p) => p.id).filter(Boolean) as string[]
  const allTierPricesMap = await getAllTierProductPrices(productIds)

  // Use retail tier for visibility filtering (products with no cost are hidden for all tiers)
  const retailPrices = allTierPricesMap["retail"] ?? {}
  const pricedProducts = applyTierPrices(products, retailPrices).filter(hasSellingPrice)

  // Pre-compute cheapest variant price per tier per product for client-side instant switching
  const productTierPricesMap = new Map<string, Record<string, number>>()
  for (const product of pricedProducts) {
    if (!product.id) continue
    const variantIds = (product.variants ?? []).map((v) => v.id).filter(Boolean) as string[]
    const tierPrices: Record<string, number> = {}
    for (const [tierId, variantPriceMap] of Object.entries(allTierPricesMap)) {
      const prices = variantIds.map((vid) => variantPriceMap[vid]).filter((p) => p > 0)
      if (prices.length > 0) tierPrices[tierId] = Math.min(...prices)
    }
    productTierPricesMap.set(product.id, tierPrices)
  }

  const filtered = searchQuery
    ? pricedProducts.filter((p) => matchesSearch(p, searchQuery))
    : pricedProducts

  const totalPages = Math.ceil(pricedProducts.length / PRODUCT_LIMIT)

  if (filtered.length === 0) {
    return (
      <p className="text-ui-fg-subtle text-sm py-8">
        По запросу ничего не найдено.
      </p>
    )
  }

  const isList = view === "list"

  return (
    <>
      <ul
        className={
          isList
            ? "w-full"
            : "grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        }
        data-testid="products-list"
      >
        {filtered.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview
                product={p}
                region={region}
                listView={isList}
                tierPrices={p.id ? productTierPricesMap.get(p.id) : undefined}
              />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}

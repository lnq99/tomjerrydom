import { listProducts, listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getAllTierProductPrices } from "@lib/data/tiers"
import { getTierId } from "@lib/data/cookies"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { applyTierPrices, hasSellingPrice } from "@lib/util/tier-prices"
import { sortProducts } from "@lib/util/sort-products"
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
  brandFilter,
  categoryIds,
  minPrice,
  maxPrice,
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
  brandFilter?: string[]
  categoryIds?: string[]
  minPrice?: number
  maxPrice?: number
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  // categoryIds from filter sidebar overrides singular categoryId prop
  if (categoryIds && categoryIds.length > 0) {
    queryParams["category_id"] = categoryIds
  } else if (categoryId) {
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

  // When post-fetch filters (brand, price, search) are active we need the full
  // sorted catalogue so we can filter-then-paginate correctly.
  const hasPostFilters =
    (brandFilter && brandFilter.length > 0) ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    !!searchQuery

  let allSortedProducts: HttpTypes.StoreProduct[]
  // catalogueCount: total products before post-fetch filtering (used for pagination in no-filter path)
  let catalogueCount = 0

  if (hasPostFilters) {
    // Fetch all products (up to 500) sorted, then we paginate ourselves after filtering
    const optionFilters = Array.from(
      new Set((optionValueIds || []).filter(Boolean))
    )
    const {
      response: { products },
    } = await listProducts({
      pageParam: 1,
      queryParams: {
        ...queryParams,
        ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
        limit: 500,
      },
      countryCode,
    })
    allSortedProducts = sortProducts(products, sortBy ?? "created_at")
  } else {
    // Normal path — listProductsWithSort handles sorting + pagination
    const {
      response: { products, count },
    } = await listProductsWithSort({
      page,
      queryParams,
      sortBy,
      countryCode,
      optionValueIds,
    })
    allSortedProducts = products
    catalogueCount = count
  }

  const productIds = allSortedProducts.map((p) => p.id).filter(Boolean) as string[]
  const allTierPricesMap = await getAllTierProductPrices(productIds)

  // Use retail tier for visibility filtering (products with no cost are hidden for all tiers)
  const retailPrices = allTierPricesMap["retail"] ?? {}
  const pricedProducts = applyTierPrices(allSortedProducts, retailPrices).filter(hasSellingPrice)

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

  // Apply brand and price filters after pricing is computed
  const tierId = await getTierId()

  let postFiltered = pricedProducts

  if (brandFilter && brandFilter.length > 0) {
    postFiltered = postFiltered.filter((p) =>
      brandFilter.includes(p.subtitle ?? "")
    )
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    postFiltered = postFiltered.filter((p) => {
      if (!p.id) return true
      const tierPrices = productTierPricesMap.get(p.id)
      if (!tierPrices) return false
      const price = tierPrices[tierId] ?? tierPrices["retail"]
      if (price === undefined) return false
      if (minPrice !== undefined && price < minPrice) return false
      if (maxPrice !== undefined && price > maxPrice) return false
      return true
    })
  }

  const filtered = searchQuery
    ? postFiltered.filter((p) => matchesSearch(p, searchQuery))
    : postFiltered

  const totalPages = hasPostFilters
    ? Math.ceil(filtered.length / PRODUCT_LIMIT)
    : Math.ceil(catalogueCount / PRODUCT_LIMIT)

  if (filtered.length === 0) {
    return (
      <p className="text-ui-fg-subtle text-sm py-8">
        По запросу ничего не найдено.
      </p>
    )
  }

  // Paginate the filtered results (only needed in hasPostFilters path)
  const pageStart = (page - 1) * PRODUCT_LIMIT
  const paginated = hasPostFilters
    ? filtered.slice(pageStart, pageStart + PRODUCT_LIMIT)
    : filtered

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
        {paginated.map((p) => {
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

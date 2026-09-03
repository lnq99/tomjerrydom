import { Metadata } from "next"

import {
  parseBrands,
  parseCategoryIds,
  parseOptionValueIds,
  parsePrice,
  MIN_PRICE_QUERY_KEY,
  MAX_PRICE_QUERY_KEY,
} from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Store",
  description: "Explore all of our products.",
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  q?: string
  view?: "grid" | "list"
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page, q, view } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const brands = parseBrands(searchParams)
  const categoryIds = parseCategoryIds(searchParams)
  const minPrice = parsePrice(searchParams, MIN_PRICE_QUERY_KEY)
  const maxPrice = parsePrice(searchParams, MAX_PRICE_QUERY_KEY)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      searchQuery={typeof q === "string" ? q : undefined}
      view={view === "list" ? "list" : "grid"}
      brandFilter={brands.length ? brands : undefined}
      categoryIds={categoryIds.length ? categoryIds : undefined}
      minPrice={minPrice}
      maxPrice={maxPrice}
    />
  )
}

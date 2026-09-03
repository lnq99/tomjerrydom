import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { listBrands } from "@lib/data/products"
import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import ViewToggle from "@modules/store/components/view-toggle"
import CatalogTierBar from "@modules/store/components/catalog-tier-bar"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
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
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  searchQuery?: string
  view?: "grid" | "list"
  brandFilter?: string[]
  categoryIds?: string[]
  minPrice?: number
  maxPrice?: number
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const [allCategories, brands] = await Promise.all([
    listCategories({ fields: "id,name,handle,parent_category_id", limit: 100 }).catch(
      () => []
    ),
    listBrands(countryCode).catch(() => [] as string[]),
  ])

  const topCategories = allCategories.filter((cat) => !cat.parent_category_id)

  const tierAndView = (
    <>
      <Suspense fallback={null}>
        <CatalogTierBar />
      </Suspense>
      <Suspense fallback={null}>
        <ViewToggle />
      </Suspense>
    </>
  )

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        mobileExtras={tierAndView}
        categories={topCategories.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
        }))}
        brands={brands}
      />

      <div className="w-full">
        {/* Desktop: title + tier + view toggle row */}
        <div className="hidden small:flex items-center justify-between gap-4 mb-8 flex-wrap">
          <h1 className="text-2xl-semi" data-testid="store-page-title">
            {searchQuery ? `Поиск: «${searchQuery}»` : "Все товары"}
          </h1>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <CatalogTierBar />
            </Suspense>
            <Suspense fallback={null}>
              <ViewToggle />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            searchQuery={searchQuery}
            view={view}
            brandFilter={brandFilter}
            categoryIds={categoryIds}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate

import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import ViewToggle from "@modules/store/components/view-toggle"
import CatalogTierBar from "@modules/store/components/catalog-tier-bar"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  searchQuery,
  view,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  searchQuery?: string
  view?: "grid" | "list"
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

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
      <RefinementList sortBy={sort} mobileExtras={tierAndView} />

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
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate

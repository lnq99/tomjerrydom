import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import ViewToggle from "@modules/store/components/view-toggle"
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

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl-semi" data-testid="store-page-title">
            {searchQuery ? `Поиск: «${searchQuery}»` : "Все товары"}
          </h1>
          <Suspense fallback={null}>
            <ViewToggle />
          </Suspense>
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

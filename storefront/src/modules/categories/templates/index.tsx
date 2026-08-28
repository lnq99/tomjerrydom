import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CatalogTierBar from "@modules/store/components/catalog-tier-bar"
import ViewToggle from "@modules/store/components/view-toggle"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  view,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  view?: "grid" | "list"
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

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
        data-testid="sort-by-container"
        hideOptionsPicker
        mobileExtras={tierAndView}
      />

      <div className="w-full">
        {/* Desktop: breadcrumb + title row + tier + view */}
        <div className="hidden small:flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex flex-row text-2xl-semi gap-4 items-baseline">
            {parents.map((parent) => (
              <span key={parent.id} className="text-ui-fg-subtle">
                <LocalizedClientLink
                  className="mr-4 hover:text-black"
                  href={`/categories/${parent.handle}`}
                  data-testid="sort-by-link"
                >
                  {parent.name}
                </LocalizedClientLink>
                /
              </span>
            ))}
            <h1 data-testid="category-page-title">{category.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <CatalogTierBar />
            </Suspense>
            <Suspense fallback={null}>
              <ViewToggle />
            </Suspense>
          </div>
        </div>

        {/* Mobile: category title only */}
        <div className="small:hidden mb-4">
          <h1 className="text-xl font-semibold" data-testid="category-page-title-mobile">
            {category.name}
          </h1>
        </div>

        {category.description && (
          <div className="mb-8 text-base-regular">
            <p>{category.description}</p>
          </div>
        )}
        {category.category_children && (
          <div className="mb-8 text-base-large">
            <ul className="grid grid-cols-1 gap-2">
              {category.category_children?.map((c) => (
                <li key={c.id}>
                  <InteractiveLink href={`/categories/${c.handle}`}>
                    {c.name}
                  </InteractiveLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            view={view}
          />
        </Suspense>
      </div>
    </div>
  )
}

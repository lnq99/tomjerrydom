"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState, type ReactNode } from "react"

import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import OptionsPicker from "./options-picker"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  mobileExtras?: ReactNode
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  hideOptionsPicker = false,
  mobileExtras,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      params.delete("page")
      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery ? `${pathname}?${currentQuery}` : pathname
      if (nextPath !== currentPath) router.push(nextPath)
    },
    [pathname, router, searchParams]
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) => params.append(OPTION_VALUE_QUERY_KEY, valueId))
    })

  const hasActiveFilters = selectedOptionValueIds.length > 0

  return (
    <div className="small:min-w-[250px] small:ml-[1.675rem]">
      {/* Mobile: single toolbar row with Фильтры + extras (tier, view toggle) */}
      <div className="small:hidden flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-rounded border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-base txt-compact-small transition-colors shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14M6 10h8M9 15h2" />
          </svg>
          Фильтры
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-ui-fg-interactive" />
          )}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3 h-3 text-ui-fg-muted transition-transform ${mobileOpen ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {mobileExtras && (
          <div className="flex items-center gap-2 ml-auto">
            {mobileExtras}
          </div>
        )}
      </div>

      {/* Collapsible filter panel — mobile only toggle, always visible on desktop */}
      <div className={`${mobileOpen ? "flex" : "hidden"} small:flex flex-col gap-12 py-4 mb-8 small:px-0 pl-6`}>
        <SortProducts
          sortBy={sortBy}
          setQueryParams={setQueryParams}
          data-testid={dataTestId}
        />
        {!hideOptionsPicker && (
          <OptionsPicker
            selectedValueIds={selectedOptionValueIds}
            setOptionValueIds={setOptionValueIds}
          />
        )}
      </div>
    </div>
  )
}

export default RefinementList

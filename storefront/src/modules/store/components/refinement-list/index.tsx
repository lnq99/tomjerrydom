"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState, type ReactNode } from "react"
import clsx from "clsx"

import {
  BRANDS_QUERY_KEY,
  CATEGORY_IDS_QUERY_KEY,
  MIN_PRICE_QUERY_KEY,
  MAX_PRICE_QUERY_KEY,
  OPTION_VALUE_QUERY_KEY,
  parseBrands,
  parseCategoryIds,
  parseOptionValueIds,
  parsePrice,
} from "@lib/util/product-option-filters"
import OptionsPicker from "./options-picker"
import SortProducts, { SortOptions } from "./sort-products"

type Category = {
  id: string
  name: string
  handle: string
}

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  mobileExtras?: ReactNode
  categories?: Category[]
  brands?: string[]
  "data-testid"?: string
}

// ---------------------------------------------------------------------------
// FilterSection — collapsible section with a title
// ---------------------------------------------------------------------------
function FilterSection({
  title,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string
  defaultOpen?: boolean
  badge?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="text-ui-fg-subtle text-xs font-semibold uppercase tracking-wide">
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ui-bg-interactive text-white text-[10px] font-semibold leading-none">
              {badge}
            </span>
          )}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={clsx(
            "w-3.5 h-3.5 text-ui-fg-muted transition-transform duration-150",
            { "rotate-180": open }
          )}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checkbox row
// ---------------------------------------------------------------------------
function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group py-0.5">
      <span
        className={clsx(
          "w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors",
          checked
            ? "border-ui-border-interactive bg-ui-bg-interactive"
            : "border-ui-border-base bg-ui-bg-base group-hover:border-ui-border-interactive"
        )}
        onClick={onChange}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className="w-3 h-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </span>
      <span
        onClick={onChange}
        className={clsx(
          "txt-compact-small transition-colors",
          checked
            ? "text-ui-fg-base"
            : "text-ui-fg-subtle hover:text-ui-fg-base"
        )}
      >
        {label}
      </span>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Main RefinementList
// ---------------------------------------------------------------------------
const RefinementList = ({
  sortBy,
  hideOptionsPicker = false,
  mobileExtras,
  categories = [],
  brands = [],
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

  // ---------- Selected values from URL ----------
  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const selectedBrands = useMemo(() => parseBrands(searchParams), [searchParams])
  const selectedCategoryIds = useMemo(
    () => parseCategoryIds(searchParams),
    [searchParams]
  )
  const activeMinPrice = useMemo(
    () => parsePrice(searchParams, MIN_PRICE_QUERY_KEY),
    [searchParams]
  )
  const activeMaxPrice = useMemo(
    () => parsePrice(searchParams, MAX_PRICE_QUERY_KEY),
    [searchParams]
  )

  // Local state for price inputs — initialized from URL so inputs reflect current filter
  const [localMin, setLocalMin] = useState<string>(() =>
    activeMinPrice !== undefined ? String(activeMinPrice) : ""
  )
  const [localMax, setLocalMax] = useState<string>(() =>
    activeMaxPrice !== undefined ? String(activeMaxPrice) : ""
  )

  // ---------- Setters ----------
  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((id) => params.append(OPTION_VALUE_QUERY_KEY, id))
    })

  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand]
    updateQueryParams((params) => {
      params.delete(BRANDS_QUERY_KEY)
      next.forEach((b) => params.append(BRANDS_QUERY_KEY, b))
    })
  }

  const toggleCategory = (id: string) => {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((c) => c !== id)
      : [...selectedCategoryIds, id]
    updateQueryParams((params) => {
      params.delete(CATEGORY_IDS_QUERY_KEY)
      next.forEach((c) => params.append(CATEGORY_IDS_QUERY_KEY, c))
    })
  }

  const applyPrice = () => {
    updateQueryParams((params) => {
      if (localMin.trim()) {
        params.set(MIN_PRICE_QUERY_KEY, localMin.trim())
      } else {
        params.delete(MIN_PRICE_QUERY_KEY)
      }
      if (localMax.trim()) {
        params.set(MAX_PRICE_QUERY_KEY, localMax.trim())
      } else {
        params.delete(MAX_PRICE_QUERY_KEY)
      }
    })
  }

  const clearAll = () => {
    setLocalMin("")
    setLocalMax("")
    updateQueryParams((params) => {
      params.delete(BRANDS_QUERY_KEY)
      params.delete(CATEGORY_IDS_QUERY_KEY)
      params.delete(MIN_PRICE_QUERY_KEY)
      params.delete(MAX_PRICE_QUERY_KEY)
      params.delete(OPTION_VALUE_QUERY_KEY)
    })
  }

  // ---------- Active filter count ----------
  const totalActiveFilters =
    selectedBrands.length +
    selectedCategoryIds.length +
    selectedOptionValueIds.length +
    (activeMinPrice !== undefined || activeMaxPrice !== undefined ? 1 : 0)

  const hasActiveFilters = totalActiveFilters > 0

  return (
    <div className="small:min-w-[250px] small:ml-[1.675rem]">
      {/* Mobile: single toolbar row */}
      <div className="small:hidden flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-rounded border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-base txt-compact-small transition-colors shrink-0"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3.5 h-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 5h14M6 10h8M9 15h2"
            />
          </svg>
          Фильтры
          {totalActiveFilters > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ui-bg-interactive text-white text-[10px] font-semibold leading-none">
              {totalActiveFilters}
            </span>
          )}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3 h-3 text-ui-fg-muted transition-transform ${mobileOpen ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {mobileExtras && (
          <div className="flex items-center gap-2 ml-auto">{mobileExtras}</div>
        )}
      </div>

      {/* Filter panel — hidden on mobile unless open, always visible on desktop */}
      <div
        className={`${mobileOpen ? "flex" : "hidden"} small:flex flex-col gap-8 py-4 mb-8 small:px-0 pl-6`}
      >
        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="self-start text-xs text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline underline-offset-2"
          >
            Сбросить все фильтры
          </button>
        )}

        {/* Сортировка */}
        <FilterSection title="Сортировка" defaultOpen>
          <SortProducts
            sortBy={sortBy}
            setQueryParams={setQueryParams}
            data-testid={dataTestId}
          />
        </FilterSection>

        {/* Категория */}
        {categories.length > 0 && (
          <FilterSection
            title="Категория"
            defaultOpen
            badge={selectedCategoryIds.length}
          >
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <CheckboxRow
                  key={cat.id}
                  label={cat.name}
                  checked={selectedCategoryIds.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Бренд */}
        {brands.length > 0 && (
          <FilterSection
            title="Бренд"
            defaultOpen={brands.length < 6}
            badge={selectedBrands.length}
          >
            <div className="flex flex-col gap-1">
              {brands.map((brand) => (
                <CheckboxRow
                  key={brand}
                  label={brand}
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Цена */}
        <FilterSection
          title="Цена"
          defaultOpen
          badge={
            activeMinPrice !== undefined || activeMaxPrice !== undefined ? 1 : 0
          }
        >
          <div className="flex flex-col gap-3">
            {(activeMinPrice !== undefined || activeMaxPrice !== undefined) && (
              <p className="text-xs text-ui-fg-subtle">
                {activeMinPrice !== undefined ? `от ${activeMinPrice} ₽` : ""}
                {activeMinPrice !== undefined && activeMaxPrice !== undefined
                  ? " — "
                  : ""}
                {activeMaxPrice !== undefined ? `до ${activeMaxPrice} ₽` : ""}
              </p>
            )}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="от ₽"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                min={0}
                className="border border-ui-border-base rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:border-ui-border-interactive"
              />
              <span className="text-ui-fg-muted text-sm flex-shrink-0">—</span>
              <input
                type="number"
                placeholder="до ₽"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                min={0}
                className="border border-ui-border-base rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:border-ui-border-interactive"
              />
            </div>
            <button
              type="button"
              onClick={applyPrice}
              className="rounded-rounded border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-base txt-compact-small px-3 py-1.5 transition-colors self-start"
            >
              Применить
            </button>
          </div>
        </FilterSection>

        {/* Характеристики */}
        {!hideOptionsPicker && (
          <FilterSection title="Характеристики" defaultOpen>
            <OptionsPicker
              selectedValueIds={selectedOptionValueIds}
              setOptionValueIds={setOptionValueIds}
            />
          </FilterSection>
        )}
      </div>
    </div>
  )
}

export default RefinementList

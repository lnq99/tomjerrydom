export const OPTION_VALUE_QUERY_KEY = "optionValueIds"
export const BRANDS_QUERY_KEY = "brands"
export const CATEGORY_IDS_QUERY_KEY = "categoryIds"
export const MIN_PRICE_QUERY_KEY = "minPrice"
export const MAX_PRICE_QUERY_KEY = "maxPrice"

export type OptionValueIds = string[]

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>

function parseMultiValue(searchParams: SearchParamsInput, key: string): string[] {
  if (typeof (searchParams as URLSearchParams).getAll === "function") {
    const values = (searchParams as URLSearchParams).getAll(key)
    return Array.from(new Set(values.filter(Boolean)))
  }

  const paramValue = (searchParams as Record<string, string | string[] | undefined>)[key]

  if (Array.isArray(paramValue)) {
    return Array.from(new Set(paramValue.filter(Boolean)))
  }

  if (typeof paramValue === "string" && paramValue.length > 0) {
    return paramValue.split(",").filter(Boolean)
  }

  return []
}

export const parseOptionValueIds = (
  searchParams: SearchParamsInput
): OptionValueIds => parseMultiValue(searchParams, OPTION_VALUE_QUERY_KEY)

export const parseBrands = (searchParams: SearchParamsInput): string[] =>
  parseMultiValue(searchParams, BRANDS_QUERY_KEY)

export const parseCategoryIds = (searchParams: SearchParamsInput): string[] =>
  parseMultiValue(searchParams, CATEGORY_IDS_QUERY_KEY)

export const parsePrice = (
  searchParams: SearchParamsInput,
  key: string
): number | undefined => {
  let raw: string | undefined

  if (typeof (searchParams as URLSearchParams).get === "function") {
    raw = (searchParams as URLSearchParams).get(key) ?? undefined
  } else {
    const val = (searchParams as Record<string, string | string[] | undefined>)[key]
    raw = Array.isArray(val) ? val[0] : val
  }

  if (!raw) return undefined
  const n = parseInt(raw, 10)
  return isNaN(n) ? undefined : n
}

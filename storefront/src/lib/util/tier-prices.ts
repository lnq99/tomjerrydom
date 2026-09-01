import { HttpTypes } from "@medusajs/types"

export function hasSellingPrice(product: HttpTypes.StoreProduct): boolean {
  return (product.variants ?? []).some((v) => {
    const amount = (v as any).calculated_price?.calculated_amount
    return typeof amount === "number" && amount > 0
  })
}

export function applyTierPrices(
  products: HttpTypes.StoreProduct[],
  tierPrices: Record<string, number>
): HttpTypes.StoreProduct[] {
  if (Object.keys(tierPrices).length === 0) return products
  return products.map((product) => {
    const variants = product.variants?.map((variant) => {
      const price = tierPrices[variant.id]
      if (price === undefined) return variant
      if (price === 0) return { ...variant, calculated_price: null } as HttpTypes.StoreProductVariant
      const cp = (variant as any).calculated_price
      return {
        ...variant,
        calculated_price: cp
          ? { ...cp, calculated_amount: price, original_amount: price }
          : null,
      } as HttpTypes.StoreProductVariant
    }) ?? null
    return { ...product, variants } as HttpTypes.StoreProduct
  })
}

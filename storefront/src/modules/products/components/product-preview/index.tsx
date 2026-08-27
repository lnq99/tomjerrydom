import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

function VariantPills({ variants }: { variants: HttpTypes.StoreProductVariant[] }) {
  if (!variants || variants.length <= 1) return null
  const MAX = 4
  const shown = variants.slice(0, MAX)
  const rest = variants.length - MAX
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {shown.map((v) => (
        <span
          key={v.id}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] leading-none border border-ui-border-base text-ui-fg-muted bg-ui-bg-subtle whitespace-nowrap"
        >
          {v.title}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] leading-none text-ui-fg-muted">
          +{rest}
        </span>
      )}
    </div>
  )
}

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
  listView,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  listView?: boolean
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const brand = typeof product.subtitle === "string" && product.subtitle ? product.subtitle : null
  const variants = product.variants ?? []

  if (listView) {
    return (
      <LocalizedClientLink href={`/products/${product.handle}`} className="group">
        <div
          data-testid="product-wrapper"
          className="flex items-center gap-4 py-3 border-b border-ui-border-base last:border-b-0"
        >
          <div className="shrink-0 w-20 h-20">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="square"
              className="!w-20 !aspect-square"
            />
          </div>
          <div className="flex flex-1 items-start justify-between gap-x-4 min-w-0">
            <div className="min-w-0">
              {brand && (
                <p className="txt-xsmall text-ui-fg-muted mb-0.5 truncate">{brand}</p>
              )}
              <Text
                className="text-ui-fg-subtle txt-compact-medium truncate"
                data-testid="product-title"
              >
                {product.title}
              </Text>
              {variants.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {variants.slice(0, 5).map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] leading-none border border-ui-border-base text-ui-fg-muted bg-ui-bg-subtle whitespace-nowrap"
                    >
                      {v.title}
                    </span>
                  ))}
                  {variants.length > 5 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] leading-none text-ui-fg-muted">
                      +{variants.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-x-2 shrink-0 pt-0.5">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
        </div>
      </LocalizedClientLink>
    )
  }

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="square"
          isFeatured={isFeatured}
        />
        <div className="mt-3">
          {brand && (
            <p className="txt-xsmall text-ui-fg-muted mb-0.5">{brand}</p>
          )}
          <div className="flex txt-compact-medium justify-between gap-x-2">
            <Text className="text-ui-fg-subtle truncate" data-testid="product-title">
              {product.title}
            </Text>
            <div className="flex items-center gap-x-2 shrink-0">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
          <VariantPills variants={variants} />
        </div>
      </div>
    </LocalizedClientLink>
  )
}

import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heading } from "@modules/common/components/ui"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      {/* Mobile-only: title above images */}
      <div className="small:hidden content-container pt-6 pb-0">
        <div className="flex flex-col gap-y-2">
          {product.collection && (
            <LocalizedClientLink
              href={`/collections/${product.collection.handle}`}
              className="text-medium text-ui-fg-muted hover:text-ui-fg-subtle"
            >
              {product.collection.title}
            </LocalizedClientLink>
          )}
          <Heading
            level="h2"
            className="text-3xl leading-10 text-ui-fg-base"
            data-testid="product-title-mobile"
          >
            {product.title}
          </Heading>
        </div>
      </div>

      <div
        className="content-container flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
      >
        {/* Desktop-only left column: full title + description + info tabs */}
        <div className="hidden small:flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={product} />
          <ProductTabs product={product} />
        </div>

        {/* Images */}
        <div className="block w-full relative">
          <ImageGallery images={images} />
        </div>

        {/* Price, variants, add-to-cart */}
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
          <ProductOnboardingCta />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
        </div>
      </div>

      {/* Mobile-only: description + info tabs below price/variants */}
      <div className="small:hidden content-container pb-8">
        {product.description && (
          <p className="text-medium text-ui-fg-subtle whitespace-pre-line mb-4">
            {product.description}
          </p>
        )}
        <ProductTabs product={product} />
      </div>

      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate

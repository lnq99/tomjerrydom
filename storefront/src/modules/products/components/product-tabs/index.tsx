import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  return (
    <div className="w-full border-t border-grey-20 py-3">
      <span className="text-ui-fg-subtle text-sm px-1">Product Information</span>
      <div className="text-small-regular py-8 px-1">
        <div className="grid grid-cols-2 gap-x-8">
          <div className="flex flex-col gap-y-4">
            <div>
              <span className="font-semibold">Material</span>
              <p>{product.material ?? "-"}</p>
            </div>
            <div>
              <span className="font-semibold">Country of origin</span>
              <p>{product.origin_country ?? "-"}</p>
            </div>
            <div>
              <span className="font-semibold">Type</span>
              <p>{product.type ? product.type.value : "-"}</p>
            </div>
          </div>
          <div className="flex flex-col gap-y-4">
            <div>
              <span className="font-semibold">Weight</span>
              <p>{product.weight ? `${product.weight} g` : "-"}</p>
            </div>
            <div>
              <span className="font-semibold">Dimensions</span>
              <p>
                {product.length && product.width && product.height
                  ? `${product.length}L x ${product.width}W x ${product.height}H`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs

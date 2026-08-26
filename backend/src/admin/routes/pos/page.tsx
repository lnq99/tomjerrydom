import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ShoppingCart } from '@medusajs/icons'
import { usePosCart } from './hooks/use-pos-cart'
import { ProductSearch } from './components/product-search'
import { CartPanel } from './components/cart-panel'

export const config = defineRouteConfig({
  label: 'POS',
  icon: ShoppingCart,
})

export default function PosPage() {
  const { cart, total, add, remove, setQty, clear } = usePosCart()

  return (
    <div className="flex h-[calc(100vh-57px)] gap-4 p-4">
      <div className="flex-1 overflow-hidden">
        <ProductSearch onAddItem={add} />
      </div>
      <div className="w-80 shrink-0 xl:w-96">
        <CartPanel
          cart={cart}
          total={total}
          onUpdateQty={setQty}
          onRemove={remove}
          onClear={clear}
        />
      </div>
    </div>
  )
}

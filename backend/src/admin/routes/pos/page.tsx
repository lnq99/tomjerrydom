import { defineRouteConfig } from '@medusajs/admin-sdk'
import { MagnifyingGlass, ShoppingCart } from '@medusajs/icons'
import { clx, Text } from '@medusajs/ui'
import { useState } from 'react'
import { usePosCart } from './hooks/use-pos-cart'
import { ProductSearch } from './components/product-search'
import { CartPanel } from './components/cart-panel'

export const config = defineRouteConfig({
  label: 'POS',
  icon: ShoppingCart,
})

export default function PosPage() {
  const { cart, total, add, remove, setQty, clear } = usePosCart()
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products')

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    // pb-14 on mobile makes room for the fixed tab bar
    <div className="relative flex h-[calc(100vh-57px)] flex-col sm:flex-row gap-4 p-4 pb-14 sm:pb-4">
      {/* Products panel — hidden on mobile when cart tab is active */}
      <div className={clx('flex-1 overflow-hidden', activeTab !== 'products' && 'hidden sm:flex sm:flex-col')}>
        <ProductSearch onAddItem={add} />
      </div>

      {/* Cart panel — hidden on mobile when products tab is active */}
      <div className={clx('sm:w-80 xl:w-96 shrink-0', activeTab !== 'cart' && 'hidden sm:block')}>
        <CartPanel
          cart={cart}
          total={total}
          onUpdateQty={setQty}
          onRemove={remove}
          onClear={clear}
        />
      </div>

      {/* Mobile tab bar — hidden on sm+ */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 border-t border-ui-border-base bg-ui-bg-base flex z-10">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={clx(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
            activeTab === 'products' ? 'text-ui-fg-base' : 'text-ui-fg-muted'
          )}
        >
          <MagnifyingGlass />
          <Text size="xsmall">Товары</Text>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cart')}
          className={clx(
            'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
            activeTab === 'cart' ? 'text-ui-fg-base' : 'text-ui-fg-muted'
          )}
        >
          <div className="relative">
            <ShoppingCart />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ui-fg-base text-[10px] font-medium text-ui-bg-base leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </div>
          <Text size="xsmall">Корзина</Text>
        </button>
      </div>
    </div>
  )
}

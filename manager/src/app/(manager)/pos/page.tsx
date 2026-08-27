"use client"

import { useReducer, useCallback, useState } from "react"
import { ShoppingCart, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductSearch } from "@/components/pos/product-search"
import { CartPanel } from "@/components/pos/cart-panel"
import {
  emptyCart, addItem, removeItem, setQty, setPrice, cartTotal,
  type Cart, type LineItem,
} from "@/lib/cart"

type Action =
  | { type: "ADD"; item: LineItem }
  | { type: "REMOVE"; variantId: string }
  | { type: "QTY"; variantId: string; quantity: number }
  | { type: "PRICE"; variantId: string; unitPrice: number }
  | { type: "CLEAR" }

function reducer(state: Cart, action: Action): Cart {
  switch (action.type) {
    case "ADD": return addItem(state, action.item)
    case "REMOVE": return removeItem(state, action.variantId)
    case "QTY": return setQty(state, action.variantId, action.quantity)
    case "PRICE": return setPrice(state, action.variantId, action.unitPrice)
    case "CLEAR": return emptyCart
  }
}

type Tab = "products" | "cart"

export default function PosPage() {
  const [cart, dispatch] = useReducer(reducer, emptyCart)
  const [tab, setTab] = useState<Tab>("products")

  const total = cartTotal(cart)
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)

  const handleAdd = useCallback((item: LineItem) => {
    dispatch({ type: "ADD", item })
    setTab("cart")
  }, [])

  return (
    <div className="flex h-[calc(100dvh-0px)] md:h-screen flex-col md:flex-row">
      {/* Products — hidden on mobile when showing cart */}
      <div className={cn(
        "flex-1 flex flex-col p-3 overflow-hidden",
        tab === "cart" ? "hidden md:flex" : "flex"
      )}>
        <ProductSearch onAddItem={handleAdd} />
      </div>

      {/* Cart — full screen on mobile, fixed sidebar on desktop */}
      <div className={cn(
        "md:w-80 xl:w-96 md:shrink-0 md:flex md:flex-col h-full",
        tab === "products" ? "hidden md:flex" : "flex flex-col flex-1"
      )}>
        <CartPanel
          cart={cart}
          total={total}
          onSetQty={(id, qty) => dispatch({ type: "QTY", variantId: id, quantity: qty })}
          onSetPrice={(id, price) => dispatch({ type: "PRICE", variantId: id, unitPrice: price })}
          onRemove={(id) => dispatch({ type: "REMOVE", variantId: id })}
          onClear={() => dispatch({ type: "CLEAR" })}
        />
      </div>

      {/* Mobile tab bar (within the page, above BottomNav) */}
      <div className="md:hidden fixed bottom-16 inset-x-0 border-t bg-background flex z-20">
        <button
          type="button"
          onClick={() => setTab("products")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            tab === "products" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Search className="h-4 w-4" />
          Товары
        </button>
        <button
          type="button"
          onClick={() => setTab("cart")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition-colors relative",
            tab === "cart" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span className="relative">
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </span>
          Корзина
        </button>
      </div>
    </div>
  )
}

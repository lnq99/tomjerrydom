"use client"

import { useReducer, useCallback, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ShoppingCart, Search } from "lucide-react"
import { cn } from "@/lib/utils"

function shortTierLabel(tier: { id: string; label: string; min_order_amount: number }): string {
  if (tier.min_order_amount === 0) return tier.label
  const rubles = tier.min_order_amount / 100
  return `Опт ${rubles >= 1000 ? `${Math.round(rubles / 1000)}к` : rubles}`
}
import { ProductSearch } from "@/components/pos/product-search"
import { CartPanel } from "@/components/pos/cart-panel"
import { getPricingConfig } from "@/lib/api"
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
  const [tierId, setTierId] = useState("retail")

  const { data: pricingData } = useQuery({
    queryKey: ["pricing-config"],
    queryFn: getPricingConfig,
    staleTime: 60_000,
  })

  const tiers = pricingData?.tiers ?? [{ id: "retail", label: "Розница", min_order_amount: 0, sort_order: 0 }]

  const total = cartTotal(cart)
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)

  const handleAdd = useCallback((item: LineItem) => {
    dispatch({ type: "ADD", item })
    setTab("cart")
  }, [])

  return (
    <div className="flex h-[calc(100dvh-0px)] md:h-screen flex-col md:flex-row">
      {/* Products panel */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        tab === "cart" ? "hidden md:flex" : "flex"
      )}>
        {/* Tier selector */}
        <div className="border-b px-3 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setTierId(tier.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border whitespace-nowrap transition-colors",
                tierId === tier.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {shortTierLabel(tier)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-3">
          <ProductSearch
            tierId={tierId}
            tiers={tiers}
            pricingData={pricingData ?? null}
            onAddItem={handleAdd}
          />
        </div>
      </div>

      {/* Cart panel */}
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

      {/* Mobile tab bar */}
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

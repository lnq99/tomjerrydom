"use client"

import { useReducer, useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ShoppingCart, Search } from "lucide-react"
import { cn, shortTierLabel } from "@/lib/utils"
import { ProductSearch } from "@/components/pos/product-search"
import { CartPanel } from "@/components/pos/cart-panel"
import { getPricingConfig } from "@/lib/api"
import {
  emptyCart, addItem, removeItem, setQty, setPrice, retierItems, cartTotal,
  type Cart, type LineItem,
} from "@/lib/cart"

// ─── Multi-tab cart state ────────────────────────────────────────────────────

type CartTab = {
  id: string
  label: string
  phone?: string
  cart: Cart
  tierId: string
}

type TabsState = {
  tabs: CartTab[]
  activeId: string
}

type CartAction =
  | { type: "ADD"; item: LineItem }
  | { type: "REMOVE"; variantId: string }
  | { type: "QTY"; variantId: string; quantity: number }
  | { type: "PRICE"; variantId: string; unitPrice: number }
  | { type: "CLEAR" }

type TabsAction =
  | { type: "CART"; tabId: string; action: CartAction }
  | { type: "RETIER"; tabId: string; tierId: string; prices: Map<string, number> }
  | { type: "ADD_TAB" }
  | { type: "CLOSE_TAB"; tabId: string }
  | { type: "SWITCH_TAB"; tabId: string }
  | { type: "UPDATE_TAB"; tabId: string; label: string; phone: string }

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "ADD":    return addItem(state, action.item)
    case "REMOVE": return removeItem(state, action.variantId)
    case "QTY":   return setQty(state, action.variantId, action.quantity)
    case "PRICE":  return setPrice(state, action.variantId, action.unitPrice)
    case "CLEAR":  return emptyCart
  }
}

const MAX_TABS = 5

function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case "CART":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, cart: cartReducer(t.cart, action.action) } : t
        ),
      }
    case "RETIER":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId
            ? { ...t, tierId: action.tierId, cart: retierItems(t.cart, action.prices) }
            : t
        ),
      }
    case "ADD_TAB": {
      if (state.tabs.length >= MAX_TABS) return state
      const newTab: CartTab = {
        id: `tab-${Date.now()}`,
        label: `Khách ${state.tabs.length + 1}`,
        cart: emptyCart,
        tierId: state.tabs.find((t) => t.id === state.activeId)?.tierId ?? "retail",
      }
      return { tabs: [...state.tabs, newTab], activeId: newTab.id }
    }
    case "CLOSE_TAB": {
      if (state.tabs.length <= 1) return state
      const idx = state.tabs.findIndex((t) => t.id === action.tabId)
      const remaining = state.tabs.filter((t) => t.id !== action.tabId)
      const newActiveId =
        action.tabId === state.activeId
          ? (remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0]?.id)
          : state.activeId
      return { tabs: remaining, activeId: newActiveId ?? remaining[0].id }
    }
    case "SWITCH_TAB":
      return { ...state, activeId: action.tabId }
    case "UPDATE_TAB":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, label: action.label || t.label, phone: action.phone || undefined } : t
        ),
      }
  }
}

// ─── localStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = "pos_tabs_v1"

function makeDefaultState(): TabsState {
  return {
    tabs: [{ id: "default", label: "Khách 1", cart: emptyCart, tierId: "retail" }],
    activeId: "default",
  }
}

function loadState(): TabsState {
  if (typeof window === "undefined") return makeDefaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TabsState
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0 && parsed.activeId) {
        return parsed
      }
    }
  } catch {}
  return makeDefaultState()
}

function saveState(state: TabsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type MobileTab = "products" | "cart"

export default function PosPage() {
  const router = useRouter()
  // useReducer lazy init — reads localStorage on first render (client only)
  const [state, dispatch] = useReducer(tabsReducer, undefined, loadState)
  const [mobileTab, setMobileTab] = useState<MobileTab>("products")

  // Persist to localStorage on every state change
  useEffect(() => { saveState(state) }, [state])

  const { data: pricingData } = useQuery({
    queryKey: ["pricing-config"],
    queryFn: getPricingConfig,
    staleTime: 60_000,
  })

  const tiers = pricingData?.tiers ?? [{ id: "retail", label: "Bán lẻ", min_order_amount: 0, sort_order: 0 }]

  const activeTab = state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0]

  const cart = activeTab.cart
  const tierId = activeTab.tierId

  const total = cartTotal(cart)
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)
  const totalItemsAcrossTabs = state.tabs.reduce((s, t) => s + t.cart.items.length, 0)

  const handleAdd = useCallback(
    (item: LineItem) => {
      dispatch({ type: "CART", tabId: state.activeId, action: { type: "ADD", item } })
      setMobileTab("cart")
    },
    [state.activeId]
  )

  function handleTierChange(newTierId: string) {
    const priceMap = new Map<string, number>()
    for (const prod of pricingData?.products ?? []) {
      priceMap.set(prod.id, prod.calculated_prices[newTierId] ?? 0)
    }
    dispatch({ type: "RETIER", tabId: state.activeId, tierId: newTierId, prices: priceMap })
  }

  // Auto-correct stale tierId from localStorage when real tiers load and don't match.
  useEffect(() => {
    if (!pricingData) return
    const firstId = pricingData.tiers[0]?.id
    if (!firstId) return
    const tierIds = new Set(pricingData.tiers.map((t) => t.id))
    const priceMap = new Map<string, number>()
    for (const prod of pricingData.products) priceMap.set(prod.id, prod.calculated_prices[firstId] ?? 0)
    for (const tab of state.tabs) {
      if (!tierIds.has(tab.tierId)) {
        dispatch({ type: "RETIER", tabId: tab.id, tierId: firstId, prices: priceMap })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingData])

  const cartTabs = state.tabs.map((t) => ({
    id: t.id,
    label: t.label,
    phone: t.phone,
    hasItems: t.cart.items.length > 0,
    isActive: t.id === state.activeId,
  }))

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
        {/* Products panel */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden",
          mobileTab === "cart" ? "hidden md:flex" : "flex"
        )}>
          <div className="border-b px-3 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleTierChange(tier.id)}
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
          mobileTab === "products" ? "hidden md:flex" : "flex flex-col flex-1"
        )}>
          <CartPanel
            cart={cart}
            total={total}
            tierId={tierId}
            tiers={tiers}
            onTierChange={handleTierChange}
            onSetQty={(id, qty) => dispatch({ type: "CART", tabId: state.activeId, action: { type: "QTY", variantId: id, quantity: qty } })}
            onSetPrice={(id, price) => dispatch({ type: "CART", tabId: state.activeId, action: { type: "PRICE", variantId: id, unitPrice: price } })}
            onRemove={(id) => dispatch({ type: "CART", tabId: state.activeId, action: { type: "REMOVE", variantId: id } })}
            onClear={() => dispatch({ type: "CART", tabId: state.activeId, action: { type: "CLEAR" } })}
            onOrderCreated={(orderId) => router.push(`/orders/${orderId}`)}
            cartTabs={cartTabs}
            onSwitchTab={(id) => dispatch({ type: "SWITCH_TAB", tabId: id })}
            onAddTab={() => dispatch({ type: "ADD_TAB" })}
            onCloseTab={(id) => dispatch({ type: "CLOSE_TAB", tabId: id })}
            onUpdateTab={(id, label, phone) => dispatch({ type: "UPDATE_TAB", tabId: id, label, phone })}
          />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden border-t bg-background flex shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("products")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            mobileTab === "products" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Search className="h-4 w-4" />
          Sản phẩm
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition-colors relative",
            mobileTab === "cart" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span className="relative">
            <ShoppingCart className="h-4 w-4" />
            {totalItemsAcrossTabs > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {totalItemsAcrossTabs > 9 ? "9+" : totalItemsAcrossTabs}
              </span>
            )}
          </span>
          Giỏ hàng
        </button>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Minus, Plus, Trash2, Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatRub, toKopecks, rubles } from "@/lib/utils"
import type { Cart, LineItem } from "@/lib/cart"

type Props = {
  cart: Cart
  total: number
  onSetQty: (variantId: string, qty: number) => void
  onSetPrice: (variantId: string, price: number) => void
  onRemove: (variantId: string) => void
  onClear: () => void
}

export function CartPanel({ cart, total, onSetQty, onSetPrice, onRemove, onClear }: Props) {
  function handleCash() {
    if (cart.items.length === 0) return
    alert(`Оплата наличными: ${formatRub(total)}`)
    onClear()
  }

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold">Корзина</h2>
        {cart.items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Очистить
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Корзина пуста
          </div>
        ) : (
          <ul className="divide-y">
            {cart.items.map((item) => (
              <CartItem
                key={item.variantId}
                item={item}
                onSetQty={onSetQty}
                onSetPrice={onSetPrice}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Итого</span>
          <span className="text-xl font-bold">{formatRub(total)}</span>
        </div>
        <Button size="xl" className="w-full" disabled={cart.items.length === 0} onClick={handleCash}>
          Оплатить наличными
        </Button>
        <Button size="lg" variant="outline" className="w-full" disabled>
          Оплатить картой (Phase 4)
        </Button>
      </div>
    </div>
  )
}

function CartItem({
  item,
  onSetQty,
  onSetPrice,
  onRemove,
}: {
  item: LineItem
  onSetQty: (id: string, qty: number) => void
  onSetPrice: (id: string, price: number) => void
  onRemove: (id: string) => void
}) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState("")

  function startEdit() {
    setPriceInput(rubles(item.unitPrice))
    setEditingPrice(true)
  }

  function commitPrice() {
    onSetPrice(item.variantId, toKopecks(priceInput))
    setEditingPrice(false)
  }

  const lineTotal = formatRub(item.unitPrice * item.quantity)
  const unitFmt = formatRub(item.unitPrice)

  return (
    <li className="px-4 py-3 flex flex-col gap-1">
      <div className="flex items-start gap-2">
        {item.thumbnail && (
          <img src={item.thumbnail} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.productTitle}</p>
          {item.variantTitle !== item.productTitle && (
            <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
          )}
        </div>
        <button type="button" onClick={() => onRemove(item.variantId)} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Qty controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetQty(item.variantId, item.quantity - 1)}
            className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-sm">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onSetQty(item.variantId, item.quantity + 1)}
            className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground">×</span>

        {/* Editable unit price */}
        {editingPrice ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              autoFocus
              type="number"
              min={0}
              className="h-7 w-24 text-sm px-2"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => { if (e.key === "Enter") commitPrice(); if (e.key === "Escape") setEditingPrice(false) }}
            />
            <button type="button" onClick={commitPrice}><Check className="h-4 w-4 text-primary" /></button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1 group text-left"
            title="Изменить цену"
          >
            <span className="text-sm">{unitFmt}</span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        <span className="ml-auto text-sm font-semibold">{lineTotal}</span>
      </div>
    </li>
  )
}

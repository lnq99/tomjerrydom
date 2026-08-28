"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, Pencil, Check, QrCode, Phone, Settings } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatRub, toKopecks, rubles, cn } from "@/lib/utils"
import { getBankingDetails, type BankingDetails } from "@/lib/banking-details"
import type { Cart, LineItem } from "@/lib/cart"

type Tier = { id: string; label: string; min_order_amount: number }

function shortTierLabel(tier: Tier): string {
  if (tier.min_order_amount === 0) return tier.label
  const r = tier.min_order_amount / 100
  return `Опт ${r >= 1000 ? `${Math.round(r / 1000)}к` : r}`
}

type Props = {
  cart: Cart
  total: number
  tierId: string
  tiers: Tier[]
  onTierChange: (tierId: string) => void
  onSetQty: (variantId: string, qty: number) => void
  onSetPrice: (variantId: string, price: number) => void
  onRemove: (variantId: string) => void
  onClear: () => void
}

export function CartPanel({ cart, total, tierId, tiers, onTierChange, onSetQty, onSetPrice, onRemove, onClear }: Props) {
  const [bankingOpen, setBankingOpen] = useState(false)
  const [banking, setBanking] = useState<BankingDetails>({ name: "", phone: "", qrUrl: "" })

  useEffect(() => {
    setBanking(getBankingDetails())
  }, [bankingOpen])

  function handleSell() {
    if (cart.items.length === 0) return
    toast.success(`Продажа на ${formatRub(total)} проведена`)
    onClear()
  }

  function handleCreateOrder() {
    if (cart.items.length === 0) return
    toast.info("Создание заказов — следующая фаза")
  }

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Tier selector — mobile only (desktop has it in the products panel) */}
      <div className="md:hidden border-b px-3 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto">
        {tiers.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onTierChange(tier.id)}
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

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
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

      {/* Items */}
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

      {/* Footer */}
      <div className="border-t px-4 py-4 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-medium">Итого</span>
          <span className="text-xl font-bold">{formatRub(total)}</span>
        </div>

        {/* Row 1: primary sell button */}
        <Button
          size="lg"
          className="w-full"
          disabled={cart.items.length === 0}
          onClick={handleSell}
        >
          Продать
        </Button>

        {/* Row 2: two secondary buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={cart.items.length === 0}
            onClick={handleCreateOrder}
          >
            Создать заказ
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setBankingOpen(true)}
          >
            <QrCode className="h-3.5 w-3.5" />
            Реквизиты
          </Button>
        </div>
      </div>

      {/* Banking details dialog */}
      <BankingDialog
        open={bankingOpen}
        onClose={() => setBankingOpen(false)}
        total={total}
        banking={banking}
      />
    </div>
  )
}

// ── Banking details dialog ────────────────────────────────────────────────────

function BankingDialog({
  open,
  onClose,
  total,
  banking,
}: {
  open: boolean
  onClose: () => void
  total: number
  banking: BankingDetails
}) {
  const router = useRouter()
  const hasDetails = banking.phone || banking.qrUrl

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Реквизиты для перевода</DialogTitle>
        </DialogHeader>

        {total > 0 && (
          <div className="text-center py-1">
            <p className="text-xs text-muted-foreground mb-0.5">Сумма к оплате</p>
            <p className="text-3xl font-bold">{formatRub(total)}</p>
          </div>
        )}

        {!hasDetails ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Реквизиты не заполнены. Добавьте номер телефона и QR-код в профиле.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { onClose(); router.push("/profile") }}
            >
              <Settings className="h-3.5 w-3.5" />
              Открыть профиль
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {banking.phone && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Phone className="h-3.5 w-3.5" />
                  <span>СБП / Перевод по номеру</span>
                </div>
                <p className="text-2xl font-bold tracking-wide">{banking.phone}</p>
                {banking.name && (
                  <p className="text-sm text-muted-foreground">{banking.name}</p>
                )}
              </div>
            )}

            {banking.qrUrl && (
              <div className="flex justify-center">
                <img
                  src={banking.qrUrl}
                  alt="QR для оплаты"
                  className="h-48 w-48 rounded-xl border object-contain bg-white p-2"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => { onClose(); router.push("/profile") }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Изменить реквизиты
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Cart item ─────────────────────────────────────────────────────────────────

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
    <li className={cn(
      "px-4 py-3 flex flex-col gap-1",
      item.manualPrice && "border-l-2 border-amber-400"
    )}>
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
        {item.manualPrice && (
          <span className="text-[10px] text-amber-500 font-medium shrink-0">ручная</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(item.variantId)}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPrice()
                if (e.key === "Escape") setEditingPrice(false)
              }}
            />
            <button type="button" onClick={commitPrice}>
              <Check className="h-4 w-4 text-primary" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1 group text-left"
            title="Изменить цену"
          >
            <span className={cn("text-sm", item.manualPrice && "text-amber-500 font-medium")}>
              {unitFmt}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        <span className="ml-auto text-sm font-semibold">{lineTotal}</span>
      </div>
    </li>
  )
}

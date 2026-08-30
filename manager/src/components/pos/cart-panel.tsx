"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Pencil, Check, QrCode, Phone, Settings, CheckCircle, Printer, Undo2, Plus, X } from "lucide-react"
import { QtyControl } from "@/components/pos/qty-control"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatRub, toKopecks, rubles, cn } from "@/lib/utils"
import { getBankingDetails, type BankingDetails } from "@/lib/banking-details"
import { createPosOrder, cancelPosOrder, type PosOrder } from "@/lib/api"
import type { Cart, LineItem } from "@/lib/cart"

type Tier = { id: string; label: string; min_order_amount: number }

function shortTierLabel(tier: Tier): string {
  if (tier.min_order_amount === 0) return tier.label
  const r = tier.min_order_amount / 100
  return `Sỉ ${r >= 1000 ? `${Math.round(r / 1000)}k` : r}`
}

type CartTabInfo = { id: string; label: string; hasItems: boolean; isActive: boolean }

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
  onOrderCreated?: (orderId: string) => void
  cartTabs: CartTabInfo[]
  onSwitchTab: (id: string) => void
  onAddTab: () => void
  onCloseTab: (id: string) => void
  onRenameTab?: (id: string, label: string) => void
}

type SaleResult = {
  order: PosOrder
  cart: Cart
  total: number
  tabId?: string
}

export function CartPanel({ cart, total, tierId, tiers, onTierChange, onSetQty, onSetPrice, onRemove, onClear, onOrderCreated, cartTabs, onSwitchTab, onAddTab, onCloseTab, onRenameTab }: Props) {
  const [bankingOpen, setBankingOpen] = useState(false)
  const [banking, setBanking] = useState<BankingDetails>({ name: "", phone: "", qrUrl: "" })
  const [selling, setSelling] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  useEffect(() => {
    setBanking(getBankingDetails())
  }, [bankingOpen])

  async function handleSell() {
    if (cart.items.length === 0 || selling) return
    setSelling(true)
    try {
      const activeTabId = cartTabs.find((t) => t.isActive)?.id
      const result = await createPosOrder({
        items: cart.items.map((i) => ({
          variantId: i.variantId,
          title: i.productTitle,
          variantTitle: i.variantTitle !== i.productTitle ? i.variantTitle : undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          thumbnail: i.thumbnail,
        })),
        total,
        tierId,
        mode: "sell",
      })
      setSaleResult({ order: result.order, cart, total, tabId: activeTabId })
      onClear()
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка при создании заказа")
    } finally {
      setSelling(false)
    }
  }

  async function handleCreateOrder() {
    if (cart.items.length === 0 || ordering) return
    setOrdering(true)
    try {
      const activeTabId = cartTabs.find((t) => t.isActive)?.id
      const result = await createPosOrder({
        items: cart.items.map((i) => ({
          variantId: i.variantId,
          title: i.productTitle,
          variantTitle: i.variantTitle !== i.productTitle ? i.variantTitle : undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          thumbnail: i.thumbnail,
        })),
        total,
        tierId,
        mode: "order",
      })
      onClear()
      if (activeTabId && cartTabs.length > 1) onCloseTab(activeTabId)
      onOrderCreated?.(result.order.id)
      toast.success(`Đơn #${result.order.display_id} đã tạo`)
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка при создании заказа")
    } finally {
      setOrdering(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-l bg-background relative">
      {/* Customer tab bar */}
      <div className="border-b px-2 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0 bg-muted/30">
        {cartTabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            onSwitch={onSwitchTab}
            onClose={onCloseTab}
            onRename={onRenameTab}
            showClose={cartTabs.length > 1}
          />
        ))}
        {cartTabs.length < 5 && (
          <button
            type="button"
            onClick={onAddTab}
            title="Thêm khách"
            className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Success overlay */}
      {saleResult && (
        <SaleSuccessOverlay
          result={saleResult}
          onDone={() => {
            const tabId = saleResult.tabId
            setSaleResult(null)
            if (tabId && cartTabs.length > 1) onCloseTab(tabId)
          }}
          onReceipt={() => setReceiptOpen(true)}
        />
      )}

      {/* Receipt dialog */}
      {saleResult && (
        <ReceiptDialog
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          order={saleResult.order}
          items={saleResult.cart.items}
          total={saleResult.total}
          banking={banking}
        />
      )}

      {/* Tier selector — mobile only */}
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
        <h2 className="font-semibold">Giỏ hàng</h2>
        {cart.items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Xóa giỏ
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Giỏ hàng trống
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
          <span className="font-medium">Tổng cộng</span>
          <span className="text-xl font-bold">{formatRub(total)}</span>
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={cart.items.length === 0 || selling}
          onClick={handleSell}
        >
          {selling ? "Đang xử lý..." : "Bán"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={cart.items.length === 0 || ordering}
            onClick={handleCreateOrder}
          >
            {ordering ? "..." : "Tạo đơn hàng"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setBankingOpen(true)}
          >
            <QrCode className="h-3.5 w-3.5" />
            Thanh toán
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

// ── Tab button with inline rename ─────────────────────────────────────────────

function TabButton({ tab, onSwitch, onClose, onRename, showClose }: {
  tab: CartTabInfo
  onSwitch: (id: string) => void
  onClose: (id: string) => void
  onRename?: (id: string, label: string) => void
  showClose: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tab.label)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    if (!tab.isActive || !onRename) return
    setDraft(tab.label)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    onRename?.(tab.id, draft)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md pl-2 pr-1 py-1 text-xs font-medium shrink-0 transition-colors",
        tab.isActive
          ? "bg-primary text-primary-foreground"
          : "bg-background border text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          className="w-20 bg-transparent border-b border-primary-foreground/50 focus:outline-none text-xs font-medium"
        />
      ) : (
        <button
          type="button"
          onClick={() => tab.isActive ? startEdit() : onSwitch(tab.id)}
          title={tab.isActive && onRename ? "Nhấn để đổi tên" : undefined}
          className="flex items-center gap-1.5 max-w-[80px] truncate"
        >
          <span className="truncate">{tab.label}</span>
          {tab.hasItems && !tab.isActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shrink-0" />
          )}
        </button>
      )}
      {showClose && !editing && (
        <button
          type="button"
          onClick={() => onClose(tab.id)}
          className={cn(
            "ml-0.5 rounded p-0.5 hover:bg-black/10 shrink-0",
            tab.isActive ? "hover:bg-white/20" : ""
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ── Sale success overlay ──────────────────────────────────────────────────────

const UNDO_SECONDS = 3

function SaleSuccessOverlay({
  result,
  onDone,
  onReceipt,
}: {
  result: SaleResult
  onDone: () => void
  onReceipt: () => void
}) {
  const [countdown, setCountdown] = useState(UNDO_SECONDS)
  const [undoing, setUndoing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [])

  async function handleUndo() {
    if (undoing) return
    setUndoing(true)
    clearInterval(timerRef.current!)
    try {
      await cancelPosOrder(result.order.id)
      toast.success("Продажа отменена")
      onDone()
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось отменить")
      setUndoing(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm p-6">
      <CheckCircle className="h-16 w-16 text-green-500" />

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Продажа завершена · #{result.order.display_id}</p>
        <p className="text-4xl font-bold">{formatRub(result.total)}</p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button className="w-full gap-2" onClick={onReceipt}>
          <Printer className="h-4 w-4" />
          Чек
        </Button>

        {countdown > 0 ? (
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={undoing}
            onClick={handleUndo}
          >
            <Undo2 className="h-4 w-4" />
            {undoing ? "Отмена..." : `Отменить (${countdown}с)`}
          </Button>
        ) : null}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onDone}>
          Готово
        </Button>
      </div>
    </div>
  )
}

// ── Russian receipt dialog ────────────────────────────────────────────────────

function ReceiptDialog({
  open,
  onClose,
  order,
  items,
  total,
  banking,
}: {
  open: boolean
  onClose: () => void
  order: PosOrder
  items: LineItem[]
  total: number
  banking: BankingDetails
}) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const now = new Date(order.created_at)
  const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
  const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })

  function handlePrint() {
    const content = receiptRef.current
    if (!content) return
    const win = window.open("", "_blank", "width=400,height=600")
    if (!win) return
    win.document.write(`
      <html><head><title>Чек #${order.display_id}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; margin: 16px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .separator { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.print()
  }

  function fmtRu(kopecks: number) {
    return (kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0 }) + " ₽"
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Чек</DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="font-mono text-xs space-y-1 border rounded p-4 bg-white text-black max-h-[60vh] overflow-y-auto"
        >
          <p className="text-center font-bold text-sm">ЧЕК</p>
          {banking.name && <p className="text-center">{banking.name}</p>}
          <p className="text-center">─────────────────────</p>
          <div className="flex justify-between">
            <span>Дата:</span><span>{dateStr}</span>
          </div>
          <div className="flex justify-between">
            <span>Время:</span><span>{timeStr}</span>
          </div>
          <div className="flex justify-between">
            <span>Чек №:</span><span>{order.display_id}</span>
          </div>
          <p className="text-center">─────────────────────</p>

          {items.map((item, i) => {
            const name = item.variantTitle !== item.productTitle
              ? `${item.productTitle} (${item.variantTitle})`
              : item.productTitle
            const lineTotal = item.unitPrice * item.quantity
            return (
              <div key={i} className="space-y-0.5">
                <p className="truncate">{name}</p>
                <div className="flex justify-between pl-2 text-[11px]">
                  <span>{item.quantity} × {fmtRu(item.unitPrice)}</span>
                  <span>{fmtRu(lineTotal)}</span>
                </div>
              </div>
            )
          })}

          <p className="text-center">─────────────────────</p>
          <div className="flex justify-between font-bold">
            <span>ИТОГО:</span>
            <span>{fmtRu(total)}</span>
          </div>
          <p className="text-center">─────────────────────</p>
          <p className="text-center text-[11px]">Оплата: наличными</p>
          <p className="text-center text-[11px]">Спасибо за покупку!</p>
        </div>

        <Button className="w-full gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Печать / PDF
        </Button>
      </DialogContent>
    </Dialog>
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
          <DialogTitle>Thông tin chuyển khoản</DialogTitle>
        </DialogHeader>

        {total > 0 && (
          <div className="text-center py-1">
            <p className="text-xs text-muted-foreground mb-0.5">Số tiền thanh toán</p>
            <p className="text-3xl font-bold">{formatRub(total)}</p>
          </div>
        )}

        {!hasDetails ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Chưa có thông tin thanh toán. Thêm số điện thoại và mã QR trong hồ sơ.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { onClose(); router.push("/profile") }}
            >
              <Settings className="h-3.5 w-3.5" />
              Mở hồ sơ
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {banking.phone && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Chuyển khoản theo số điện thoại</span>
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
                  alt="Mã QR thanh toán"
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
              Thay đổi thông tin thanh toán
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
          <span className="text-[10px] text-amber-500 font-medium shrink-0">thủ công</span>
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
        <QtyControl
          value={item.quantity}
          onChange={(qty) => onSetQty(item.variantId, qty)}
          min={0}
        />

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
            title="Thay đổi giá"
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

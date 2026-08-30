"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, AlertCircle, Check, Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QtyControl } from "@/components/pos/qty-control"
import { getPosOrder, updatePosOrder, markOrderAsPaid, type OrderDetail, type OrderDetailItem } from "@/lib/api"
import { formatRub, rubles, toKopecks, cn } from "@/lib/utils"
import { format } from "date-fns"

// ─── Types ───────────────────────────────────────────────────────────────────

type ExtraItem = { key: string; title: string; quantity: number; unit_price: number }

type PickState = {
  picked: Record<string, number>
  prices: Record<string, number>
  extras: ExtraItem[]
  customerName: string
  customerPhone: string
  customerNote: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
  completed:      { label: "Hoàn thành",    variant: "success" },
  pending:        { label: "Chờ thanh toán", variant: "warning" },
  cancelled:      { label: "Đã hủy",        variant: "destructive" },
  archived:       { label: "Lưu trữ",       variant: "secondary" },
  draft:          { label: "Nháp",          variant: "outline" },
  requires_action:{ label: "Cần xử lý",     variant: "warning" },
}

function initPickState(order: OrderDetail): PickState {
  const meta = order.metadata ?? {}
  return {
    picked: Object.fromEntries(order.items.map((i) => [i.id, i.quantity])),
    prices: Object.fromEntries(order.items.map((i) => [i.id, i.unit_price])),
    extras: [],
    customerName: String(meta.customer_name ?? ""),
    customerPhone: String(meta.customer_phone ?? ""),
    customerNote: String(meta.customer_note ?? ""),
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pos-order", id],
    queryFn: () => getPosOrder(id),
  })
  const order = data?.order

  const [ps, setPs] = useState<PickState | null>(null)
  const [view, setView] = useState<"pick" | "review">("pick")
  const [flashMissing, setFlashMissing] = useState(false)
  const [showViewAnyway, setShowViewAnyway] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (order && !ps) setPs(initPickState(order))
  }, [order, ps])

  if (isLoading || !order || !ps) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Đang tải...
      </div>
    )
  }

  const isReadOnly = order.status === "completed" || order.status === "cancelled"

  const hasMissing = order.items.some((i) => (ps.picked[i.id] ?? i.quantity) < i.quantity)

  const beforeTotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const afterTotal =
    order.items.reduce((s, i) => s + (ps.prices[i.id] ?? i.unit_price) * (ps.picked[i.id] ?? i.quantity), 0) +
    ps.extras.reduce((s, g) => s + g.unit_price * g.quantity, 0)

  function setPicked(itemId: string, qty: number) {
    setPs((prev) => prev ? { ...prev, picked: { ...prev.picked, [itemId]: qty } } : prev)
  }

  function setItemPrice(itemId: string, kopecks: number) {
    setPs((prev) => prev ? { ...prev, prices: { ...prev.prices, [itemId]: kopecks } } : prev)
  }

  function handleViewClick() {
    if (hasMissing && !showViewAnyway) {
      setFlashMissing(true)
      setShowViewAnyway(true)
      setTimeout(() => setFlashMissing(false), 1400)
      return
    }
    setView("review")
    setShowViewAnyway(false)
  }

  async function handleFinishPicking() {
    if (!order || !ps) return
    setSaving(true)
    try {
      await updatePosOrder(id, {
        items: [
          ...order.items.map((item) => ({
            action: "update" as const,
            id: item.id,
            quantity: ps.picked[item.id] ?? item.quantity,
            unit_price: ps.prices[item.id] ?? item.unit_price,
          })),
          ...ps.extras.map((g) => ({
            action: "add" as const,
            title: g.title,
            quantity: g.quantity,
            unit_price: g.unit_price,
          })),
        ],
        metadata: {
          customer_name: ps.customerName || undefined,
          customer_phone: ps.customerPhone || undefined,
          customer_note: ps.customerNote || undefined,
          picking_done: true,
        },
      })
      const result = await refetch()
      const newOrder = result.data?.order
      setPs(
        newOrder
          ? {
              picked: Object.fromEntries(newOrder.items.map((i) => [i.id, i.quantity])),
              prices: Object.fromEntries(newOrder.items.map((i) => [i.id, i.unit_price])),
              extras: [],
              customerName: String(newOrder.metadata?.customer_name ?? ""),
              customerPhone: String(newOrder.metadata?.customer_phone ?? ""),
              customerNote: String(newOrder.metadata?.customer_note ?? ""),
            }
          : null
      )
      setView("pick")
      toast.success("Đã lưu đơn hàng")
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi khi lưu")
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    setSaving(true)
    try {
      await updatePosOrder(id, { complete: true })
      await refetch()
      toast.success("Đơn hàng đã hoàn thành")
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi")
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid() {
    setSaving(true)
    try {
      await markOrderAsPaid(id)
      await refetch()
      toast.success("Đã đánh dấu là đã thanh toán")
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi")
    } finally {
      setSaving(false)
    }
  }

  const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, variant: "outline" as const }

  // ── Review overlay ──────────────────────────────────────────────────────────
  if (view === "review") {
    return (
      <ReviewView
        order={order}
        ps={ps}
        beforeTotal={beforeTotal}
        afterTotal={afterTotal}
        saving={saving}
        onBack={() => setView("pick")}
        onSetPrice={setItemPrice}
        onSetExtraPrice={(key, kopecks) =>
          setPs((prev) =>
            prev
              ? { ...prev, extras: prev.extras.map((g) => (g.key === key ? { ...g, unit_price: kopecks } : g)) }
              : prev
          )
        }
        onFinish={handleFinishPicking}
      />
    )
  }

  // ── Pick / view-only view ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg">Đơn #{order.display_id}</span>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {order.payment_status === "captured" && (
              <Badge variant="success">Đã thanh toán</Badge>
            )}
            {order.payment_status && order.payment_status !== "captured" && order.payment_status !== "not_paid" && (
              <Badge variant="warning">{order.payment_status}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "d MMM yyyy, HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.payment_status !== "captured" && order.status !== "cancelled" && (
            <Button size="sm" variant="outline" onClick={handleMarkPaid} disabled={saving} className="text-green-600 border-green-600 hover:bg-green-50">
              <Check className="h-3.5 w-3.5 mr-1" />
              Đã thanh toán
            </Button>
          )}
          {!isReadOnly && order.status === "pending" && (
            <Button size="sm" variant="outline" onClick={handleComplete} disabled={saving}>
              Hoàn thành
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Customer */}
        <CustomerSection orderId={id} ps={ps} setPs={setPs} completed={order.status === "completed"} />

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sản phẩm</p>
          <div className="space-y-2">
            {order.items.map((item) => {
              const picked = ps.picked[item.id] ?? item.quantity
              const isMissing = picked < item.quantity
              return (
                <ItemPickRow
                  key={item.id}
                  item={item}
                  picked={picked}
                  flash={flashMissing && isMissing}
                  readOnly={isReadOnly}
                  onPick={(qty) => setPicked(item.id, qty)}
                />
              )
            })}
            {ps.extras.map((g, idx) => (
              <ExtraRow
                key={g.key}
                extra={g}
                readOnly={isReadOnly}
                onRemove={() =>
                  setPs((prev) =>
                    prev ? { ...prev, extras: prev.extras.filter((_, i) => i !== idx) } : prev
                  )
                }
              />
            ))}
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setAddItemOpen(true)}
              className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              + Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      {!isReadOnly && (
        <div className="border-t px-4 py-3 shrink-0">
          {showViewAnyway && hasMissing && (
            <div className="flex items-center gap-1.5 text-xs text-destructive mb-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Một số sản phẩm thiếu hàng.</span>
              <button
                type="button"
                className="underline font-semibold ml-0.5"
                onClick={() => { setView("review"); setShowViewAnyway(false) }}
              >
                Xem vậy đi
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Tổng: </span>
              <span className="font-bold">{formatRub(afterTotal)}</span>
            </div>
            <Button onClick={handleViewClick} className="shrink-0">
              Xem đơn →
            </Button>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="border-t px-4 py-3 shrink-0 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">Tổng đơn hàng</div>
          <div className="font-bold">{formatRub(beforeTotal)}</div>
        </div>
      )}

      <AddItemDialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        onAdd={(item) => {
          setPs((prev) =>
            prev
              ? { ...prev, extras: [...prev.extras, { ...item, key: `extra-${Date.now()}` }] }
              : prev
          )
          setAddItemOpen(false)
        }}
      />
    </div>
  )
}

// ─── Customer Section ─────────────────────────────────────────────────────────

function CustomerSection({
  orderId,
  ps,
  setPs,
  completed,
}: {
  orderId: string
  ps: PickState
  setPs: React.Dispatch<React.SetStateAction<PickState | null>>
  completed: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [draft, setDraft] = useState({ name: "", phone: "", note: "" })
  const [saving, setSaving] = useState(false)

  const hasInfo = ps.customerName || ps.customerPhone || ps.customerNote
  const canEdit = !completed || unlocked

  function startEdit() {
    setDraft({ name: ps.customerName, phone: ps.customerPhone, note: ps.customerNote })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      if (completed) {
        // persist immediately for completed orders
        await updatePosOrder(orderId, {
          metadata: {
            customer_name: draft.name || undefined,
            customer_phone: draft.phone || undefined,
            customer_note: draft.note || undefined,
          },
        })
      }
      setPs((prev) =>
        prev
          ? { ...prev, customerName: draft.name, customerPhone: draft.phone, customerNote: draft.note }
          : prev
      )
      setEditing(false)
      setUnlocked(false)
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi khi lưu")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Khách hàng</p>
        {!editing && (
          completed && !unlocked ? (
            <button
              type="button"
              onClick={() => setUnlocked(true)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </button>
          ) : canEdit ? (
            <button type="button" onClick={startEdit} className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input placeholder="Tên khách hàng" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder="Số điện thoại" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder="Ghi chú" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} className="h-8 text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="h-7 text-xs">
              {saving ? "..." : "Lưu"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setUnlocked(false) }} className="h-7 text-xs">Hủy</Button>
          </div>
        </div>
      ) : hasInfo ? (
        <div className="text-sm space-y-0.5">
          {ps.customerName && <p className="font-medium">{ps.customerName}</p>}
          {ps.customerPhone && <p className="text-muted-foreground">{ps.customerPhone}</p>}
          {ps.customerNote && <p className="text-muted-foreground italic">{ps.customerNote}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Chưa có thông tin khách hàng</p>
      )}
    </div>
  )
}

// ─── Item Pick Row ────────────────────────────────────────────────────────────

function ItemPickRow({
  item,
  picked,
  flash,
  readOnly,
  onPick,
}: {
  item: OrderDetailItem
  picked: number
  flash: boolean
  readOnly: boolean
  onPick: (qty: number) => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        flash && picked < item.quantity && "border-destructive bg-destructive/5 animate-pulse"
      )}
    >
      {/* Thumbnail */}
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
      ) : (
        <div className="h-12 w-12 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
          —
        </div>
      )}

      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatRub(item.unit_price)} / cái</p>
      </div>

      {/* Qty control */}
      {readOnly ? (
        <span className="text-sm font-medium text-muted-foreground shrink-0">× {picked}</span>
      ) : (
        <QtyControl
          value={picked}
          ordered={item.quantity}
          onChange={onPick}
          min={0}
        />
      )}
    </div>
  )
}

// ─── Extra Item Row ───────────────────────────────────────────────────────────

function ExtraRow({
  extra,
  readOnly,
  onRemove,
}: {
  extra: ExtraItem
  readOnly: boolean
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
      <div className="h-12 w-12 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
        +
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{extra.title}</p>
        <p className="text-xs text-muted-foreground">
          {extra.unit_price === 0 ? "Miễn phí" : formatRub(extra.unit_price)} × {extra.quantity}
        </p>
      </div>
      {!readOnly && (
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ─── Review View ──────────────────────────────────────────────────────────────

function ReviewView({
  order,
  ps,
  beforeTotal,
  afterTotal,
  saving,
  onBack,
  onSetPrice,
  onSetExtraPrice,
  onFinish,
}: {
  order: OrderDetail
  ps: PickState
  beforeTotal: number
  afterTotal: number
  saving: boolean
  onBack: () => void
  onSetPrice: (itemId: string, kopecks: number) => void
  onSetExtraPrice: (key: string, kopecks: number) => void
  onFinish: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-bold text-base flex-1">Xem lại đơn #{order.display_id}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {order.items.map((item) => {
          const picked = ps.picked[item.id] ?? item.quantity
          const price = ps.prices[item.id] ?? item.unit_price
          const qtyChanged = picked !== item.quantity
          const priceChanged = price !== item.unit_price
          const isMissing = picked < item.quantity
          const isExtra = picked > item.quantity

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border p-3 space-y-2",
                isMissing && "border-destructive/40 bg-destructive/5",
                picked === 0 && "opacity-40"
              )}
            >
              <div className="flex items-start gap-3">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt="" className="h-10 w-10 rounded object-cover shrink-0 mt-0.5" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    {qtyChanged ? (
                      <>
                        <span className="line-through text-muted-foreground">× {item.quantity}</span>
                        <span className={cn("font-semibold", isMissing ? "text-destructive" : isExtra ? "text-green-600" : "")}>
                          → {picked}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">× {picked}</span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-semibold shrink-0">{formatRub(price * picked)}</div>
              </div>

              {/* Price editor */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-dashed">
                <span className="text-xs text-muted-foreground shrink-0">Giá / cái:</span>
                {priceChanged && (
                  <span className="text-xs line-through text-muted-foreground">{formatRub(item.unit_price)}</span>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="number"
                    value={rubles(price)}
                    min={0}
                    step={1}
                    onChange={(e) => onSetPrice(item.id, toKopecks(e.target.value))}
                    className="w-24 text-sm border rounded h-7 px-2 text-right focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                  />
                  <span className="text-xs text-muted-foreground">₽</span>
                </div>
              </div>
            </div>
          )
        })}

        {ps.extras.map((g) => (
          <div key={g.key} className="rounded-lg border border-dashed p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{g.title}</p>
                <p className="text-xs text-muted-foreground">× {g.quantity}</p>
              </div>
              <div className="text-sm font-semibold">
                {g.unit_price === 0 ? "Miễn phí" : formatRub(g.unit_price * g.quantity)}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 border-t border-dashed">
              <span className="text-xs text-muted-foreground shrink-0">Giá / cái:</span>
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  value={rubles(g.unit_price)}
                  min={0}
                  step={1}
                  onChange={(e) => onSetExtraPrice(g.key, toKopecks(e.target.value))}
                  className="w-24 text-sm border rounded h-7 px-2 text-right focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
                <span className="text-xs text-muted-foreground">₽</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-4 shrink-0 space-y-3">
        {beforeTotal !== afterTotal && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Trước điều chỉnh:</span>
            <span className="line-through">{formatRub(beforeTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>Tổng thực tế:</span>
          <span>{formatRub(afterTotal)}</span>
        </div>
        <Button className="w-full" onClick={onFinish} disabled={saving}>
          {saving ? "Đang lưu..." : "Xác nhận đơn hàng"}
        </Button>
      </div>
    </div>
  )
}

// ─── Add Item Dialog ──────────────────────────────────────────────────────────

function AddItemDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (item: Omit<ExtraItem, "key">) => void
}) {
  const [title, setTitle] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [priceRub, setPriceRub] = useState("")

  function handleAdd() {
    if (!title.trim()) return
    onAdd({ title: title.trim(), quantity, unit_price: toKopecks(priceRub) })
    setTitle("")
    setQuantity(1)
    setPriceRub("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Tên sản phẩm</label>
            <Input
              placeholder="Nhập tên..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Số lượng</label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Giá (₽, 0 = miễn phí)</label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={priceRub}
                onChange={(e) => setPriceRub(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleAdd} disabled={!title.trim()} className="flex-1">Thêm</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

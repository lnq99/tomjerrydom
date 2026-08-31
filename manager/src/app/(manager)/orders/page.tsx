"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listOrders, type AdminOrder } from "@/lib/api"
import { formatRub } from "@/lib/utils"
import { format, isToday } from "date-fns"
import { cn } from "@/lib/utils"

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline"; dot: string }> = {
  completed:       { label: "Hoàn thành",  variant: "success",     dot: "bg-green-500" },
  pending:         { label: "Đang xử lý",  variant: "outline",     dot: "bg-amber-400" },
  requires_action: { label: "Cần xử lý",  variant: "warning",     dot: "bg-orange-500" },
  canceled:        { label: "Đã hủy",      variant: "destructive", dot: "bg-red-500" },
  archived:        { label: "Lưu trữ",     variant: "secondary",   dot: "bg-gray-400" },
  draft:           { label: "Nháp",        variant: "outline",     dot: "bg-gray-300" },
}

const DATE_FILTERS = [
  { id: "all",   label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "7days", label: "7 ngày" },
] as const
type DateFilter = "all" | "today" | "7days"

type FilterState = {
  statuses: string[]        // empty = all
  showCanceled: boolean
  showOldArchived: boolean
}
const DEFAULT_FILTER: FilterState = { statuses: [], showCanceled: false, showOldArchived: false }

function getDateGte(filter: DateFilter): string | undefined {
  const now = new Date()
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (filter === "7days") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  return undefined
}

export default function OrdersPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [filterOpen, setFilterOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["orders", offset, dateFilter],
    queryFn: () => listOrders({ limit: 100, offset, created_at_gte: getDateGte(dateFilter) }),
  })

  const orders = data?.orders ?? []
  const count = data?.count ?? 0

  const filtered = orders.filter((o) => {
    if (o.status === "canceled" && !filter.showCanceled) return false
    if (o.status === "archived" && !filter.showOldArchived && !isToday(new Date(o.created_at))) return false
    if (filter.statuses.length > 0 && !filter.statuses.includes(o.status)) return false
    const q = search.toLowerCase()
    if (q) {
      const name = String(o.metadata?.customer_name ?? "")
      const phone = String(o.metadata?.customer_phone ?? "")
      if (!String(o.display_id).includes(q) &&
          !o.customer?.email?.toLowerCase().includes(q) &&
          !name.toLowerCase().includes(q) &&
          !phone.includes(q)) return false
    }
    return true
  })

  const activeFilters =
    (filter.showCanceled ? 1 : 0) +
    (filter.showOldArchived ? 1 : 0) +
    filter.statuses.length

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 pt-4 pb-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Đơn hàng</h1>
          <span className="text-xs text-muted-foreground">{filtered.length} / {count}</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Tìm ID, tên, số điện thoại..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="shrink-0 relative h-10 px-3" onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
          {DATE_FILTERS.map((f) => (
            <Chip key={f.id} active={dateFilter === f.id} onClick={() => { setDateFilter(f.id as DateFilter); setOffset(0) }}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Không tìm thấy đơn hàng</div>
        ) : (
          <div className="divide-y">
            {filtered.map((order) => (
              <OrderRow key={order.id} order={order} onClick={() => router.push(`/orders/${order.id}`)} />
            ))}
          </div>
        )}
        {count > orders.length && (
          <div className="flex justify-center p-4">
            <button type="button" onClick={() => setOffset(offset + 100)} className="text-sm text-primary hover:underline">
              Tải thêm
            </button>
          </div>
        )}
      </div>

      <FilterModal
        open={filterOpen}
        filter={filter}
        onApply={(f) => { setFilter(f); setFilterOpen(false) }}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  )
}

// ── Filter Modal ──────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  { id: "pending",         label: "Đang xử lý" },
  { id: "completed",       label: "Hoàn thành" },
  { id: "requires_action", label: "Cần xử lý" },
  { id: "draft",           label: "Nháp" },
]

function FilterModal({ open, filter, onApply, onClose }: {
  open: boolean
  filter: FilterState
  onApply: (f: FilterState) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<FilterState>(filter)

  function toggleStatus(id: string) {
    setDraft((d) => ({
      ...d,
      statuses: d.statuses.includes(id) ? d.statuses.filter((s) => s !== id) : [...d.statuses, id],
    }))
  }

  function reset() { setDraft(DEFAULT_FILTER) }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bộ lọc đơn hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Trạng thái</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStatus(s.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    draft.statuses.includes(s.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {draft.statuses.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5">Chỉ hiện các trạng thái đã chọn</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hiển thị thêm</p>
            <div className="space-y-2">
              <Toggle
                label="Đơn đã hủy"
                checked={draft.showCanceled}
                onChange={(v) => setDraft((d) => ({ ...d, showCanceled: v }))}
              />
              <Toggle
                label="Đơn lưu trữ cũ (không phải hôm nay)"
                checked={draft.showOldArchived}
                onChange={(v) => setDraft((d) => ({ ...d, showOldArchived: v }))}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={reset} className="flex-none">Đặt lại</Button>
          <Button onClick={() => onApply(draft)} className="flex-1">Áp dụng</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 w-full text-left">
      <div className={cn(
        "h-5 w-9 rounded-full transition-colors relative shrink-0",
        checked ? "bg-primary" : "bg-muted"
      )}>
        <span className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} />
      </div>
      <span className="text-sm">{label}</span>
    </button>
  )
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors whitespace-nowrap",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-accent"
      )}
    >
      {children}
    </button>
  )
}

// ── Order Row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, onClick }: { order: AdminOrder; onClick: () => void }) {
  const s = STATUS_MAP[order.status] ?? { label: order.status, variant: "outline" as const, dot: "bg-gray-300" }
  const date = format(new Date(order.created_at), "d MMM, HH:mm")
  const customerName =
    String(order.metadata?.customer_name || "") ||
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
    order.customer?.email ||
    "Khách"

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5", s.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">#{order.display_id}</span>
          <span className="text-xs text-muted-foreground truncate">{customerName}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{date}</span>
          {order.status !== "completed" && order.status !== "canceled" && order.payment_status === "captured" && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0">Đã TT</Badge>
          )}
          {order.status !== "canceled" && order.payment_status === "not_paid" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-400 border-red-200">Chưa TT</Badge>
          )}
        </div>
      </div>
      <span className="font-semibold text-sm shrink-0">{formatRub(order.total)}</span>
    </button>
  )
}

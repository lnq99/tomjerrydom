"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { listOrders, type AdminOrder } from "@/lib/api"
import { formatRub } from "@/lib/utils"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
  completed:      { label: "Выполнен",          variant: "success" },
  pending:        { label: "Ожидает оплаты",    variant: "warning" },
  requires_action:{ label: "Требует действия",  variant: "warning" },
  cancelled:      { label: "Отменён",           variant: "destructive" },
  archived:       { label: "Архив",             variant: "secondary" },
  draft:          { label: "Черновик",          variant: "outline" },
}

const ALL_STATUSES = ["all", "pending", "completed", "cancelled", "requires_action"]

export default function OrdersPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [offset, setOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["orders", offset],
    queryFn: () => listOrders({ limit: 50, offset }),
  })

  const orders = data?.orders ?? []
  const count = data?.count ?? 0

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      String(o.display_id).includes(q) ||
      o.customer?.email?.toLowerCase().includes(q) ||
      `${o.customer?.first_name ?? ""} ${o.customer?.last_name ?? ""}`.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 space-y-3">
        <h1 className="text-xl font-bold">Заказы</h1>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ID заказа или email клиента..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={[
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent",
              ].join(" ")}
            >
              {s === "all" ? "Все" : (STATUS_MAP[s]?.label ?? s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Заказов не найдено</div>
        ) : (
          <div className="divide-y">
            {filtered.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              />
            ))}
          </div>
        )}

        {count > orders.length && (
          <div className="flex justify-center p-4">
            <button
              type="button"
              onClick={() => setOffset(offset + 50)}
              className="text-sm text-primary hover:underline"
            >
              Загрузить ещё
            </button>
          </div>
        )}
      </div>

      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        Показано {filtered.length} из {count} заказов
      </div>
    </div>
  )
}

function OrderRow({ order, expanded, onToggle }: { order: AdminOrder; expanded: boolean; onToggle: () => void }) {
  const s = STATUS_MAP[order.status] ?? { label: order.status, variant: "outline" as const }
  const date = format(new Date(order.created_at), "d MMM yyyy, HH:mm", { locale: ru })
  const customerName =
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
    order.customer?.email ||
    "Гость"

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
      >
        <span className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">#{order.display_id}</span>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{customerName} · {date}</div>
        </div>

        <span className="font-semibold text-sm shrink-0">{formatRub(order.total)}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-muted/30 border-t">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Состав заказа</p>
          <div className="space-y-1">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.title} × {item.quantity}
                </span>
                <span>{formatRub(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t">
            <span>Итого</span>
            <span>{formatRub(order.total)}</span>
          </div>
          {order.customer?.email && (
            <p className="text-xs text-muted-foreground mt-2">Email: {order.customer.email}</p>
          )}
        </div>
      )}
    </div>
  )
}

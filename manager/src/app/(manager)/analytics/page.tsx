"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { subDays, format, startOfDay, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { listOrders, type AdminOrder } from "@/lib/api"
import { formatRub } from "@/lib/utils"

const RANGES = [
  { label: "7 ng", days: 7 },
  { label: "30 ng", days: 30 },
  { label: "90 ng", days: 90 },
]

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)

  const since = useMemo(
    () => subDays(startOfDay(new Date()), days - 1).toISOString(),
    [days]
  )

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-orders", days],
    queryFn: () => listOrders({ limit: 500, created_at_gte: since }),
    staleTime: 60_000,
  })

  const orders = data?.orders ?? []

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status !== "cancelled" && o.status !== "draft")
    const revenue = completed.reduce((s, o) => s + o.total, 0)
    const avg = completed.length ? Math.round(revenue / completed.length) : 0
    return { count: completed.length, revenue, avg }
  }, [orders])

  const chartData = useMemo(() => {
    const map: Record<string, number> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd.MM")
      map[d] = 0
    }
    for (const o of orders) {
      if (o.status === "cancelled" || o.status === "draft") continue
      const d = format(parseISO(o.created_at), "dd.MM")
      if (d in map) map[d] = (map[d] ?? 0) + o.total
    }
    return Object.entries(map).map(([date, revenue]) => ({ date, revenue }))
  }, [orders, days])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="border-b px-4 py-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Phân tích</h1>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                days === r.days
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Đơn hàng" value={String(stats.count)} loading={isLoading} />
          <StatCard label="Doanh thu" value={formatRub(stats.revenue)} loading={isLoading} />
          <StatCard label="TB/đơn" value={formatRub(stats.avg)} loading={isLoading} />
        </div>

        {/* Chart */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium mb-4">Doanh thu theo ngày</p>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={days <= 7 ? 0 : days <= 30 ? 4 : 13}
                />
                <YAxis
                  tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 100 / 1000)}k` : `${Math.round(v / 100)}`}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [formatRub(v), "Doanh thu"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">Đơn hàng gần đây</p>
          </div>
          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
          ) : (
            <div className="divide-y">
              {orders.slice(0, 10).map((o) => <RecentOrderRow key={o.id} order={o} />)}
              {orders.length === 0 && (
                <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                  Không có đơn hàng trong kỳ
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1 truncate">{loading ? "…" : value}</p>
    </div>
  )
}

function RecentOrderRow({ order }: { order: AdminOrder }) {
  const date = format(parseISO(order.created_at), "d MMM, HH:mm", { locale: vi })
  const customer =
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
    order.customer?.email ||
    "Khách"
  const isCancelled = order.status === "cancelled"

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div>
        <span className="text-sm font-medium">#{order.display_id}</span>
        <span className="text-xs text-muted-foreground ml-2">{customer}</span>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
          {formatRub(order.total)}
        </p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  )
}

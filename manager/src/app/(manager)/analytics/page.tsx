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
import { useSensitive } from "@/lib/sensitive-context"

const RANGES = [
  { label: "7 ng", days: 7 },
  { label: "30 ng", days: 30 },
  { label: "90 ng", days: 90 },
]

function orderCost(o: AdminOrder): number {
  return (o.metadata?.total_cost as number) ?? 0
}

function isCountable(o: AdminOrder): boolean {
  return o.status === "completed" && o.payment_status === "captured"
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const { show: showSensitive } = useSensitive()

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
    const countable = orders.filter(isCountable)
    const revenue = countable.reduce((s, o) => s + o.total, 0)
    // Only compute profit for orders that have a cost snapshot
    const withCost = countable.filter((o) => orderCost(o) > 0)
    const costTotal = withCost.reduce((s, o) => s + orderCost(o), 0)
    const revenueWithCost = withCost.reduce((s, o) => s + o.total, 0)
    const profit = revenueWithCost - costTotal
    const avg = countable.length ? Math.round(revenue / countable.length) : 0
    return { count: countable.length, revenue, profit, avg, hasCostData: withCost.length > 0 }
  }, [orders])

  const chartData = useMemo(() => {
    const map: Record<string, { baseCost: number; profit: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd.MM")
      map[d] = { baseCost: 0, profit: 0 }
    }
    for (const o of orders) {
      if (!isCountable(o)) continue
      const d = format(parseISO(o.created_at), "dd.MM")
      if (!(d in map)) continue
      const cost = orderCost(o)
      if (cost > 0) {
        // Cost data known: split into cost (bottom) + profit (green top)
        map[d].baseCost += cost
        map[d].profit += Math.max(0, o.total - cost)
      } else {
        // No cost data: show full revenue as base (primary), no profit shown
        map[d].baseCost += o.total
      }
    }
    return Object.entries(map).map(([date, { baseCost, profit }]) => ({ date, baseCost, profit }))
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Đơn hàng" value={String(stats.count)} loading={isLoading} />
          <StatCard label="Doanh thu" value={formatRub(stats.revenue)} loading={isLoading} />
          <StatCard label="TB/đơn" value={formatRub(stats.avg)} loading={isLoading} />
          {!stats.hasCostData ? (
            <StatCard label="Lợi nhuận" value="—" loading={isLoading} green />
          ) : showSensitive ? (
            <StatCard label="Lợi nhuận" value={formatRub(stats.profit)} loading={isLoading} green />
          ) : (
            <StatCard label="Lợi nhuận" value="••••••" loading={isLoading} green />
          )}
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
                  formatter={(v: number, name: string) => [
                    formatRub(v),
                    name === "profit" ? "Lợi nhuận" : "Doanh thu",
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                  }}
                />
                <Bar dataKey="baseCost" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                <Bar dataKey="profit" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
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
              {orders.slice(0, 10).map((o) => <RecentOrderRow key={o.id} order={o} showSensitive={showSensitive} />)}
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

function StatCard({ label, value, loading, green }: { label: string; value: string; loading: boolean; green?: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={["text-lg font-bold mt-1 truncate", green ? "text-green-600" : ""].join(" ")}>
        {loading ? "…" : value}
      </p>
    </div>
  )
}

function RecentOrderRow({ order, showSensitive }: { order: AdminOrder; showSensitive: boolean }) {
  const date = format(parseISO(order.created_at), "d MMM, HH:mm", { locale: vi })
  const customer =
    String(order.metadata?.customer_name || "") ||
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
    order.customer?.email ||
    "Khách"
  const isCancelled = !isCountable(order)
  const cost = orderCost(order)
  const profit = order.total - cost

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">#{order.display_id}</span>
        <span className="text-xs text-muted-foreground ml-2 truncate">{customer}</span>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={`text-sm font-medium ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
          {formatRub(order.total)}
        </p>
        {!isCancelled && cost > 0 && (
          <p className={`text-xs font-medium ${showSensitive ? "text-green-600" : "text-muted-foreground"}`}>
            {showSensitive ? `+${formatRub(profit)}` : "••••"}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  )
}

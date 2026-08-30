"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  getPricingConfig, saveCategoryMargins, saveProductCosts, syncPrices,
  type PricingConfig,
} from "@/lib/api"
import { formatRub, rubles, toKopecks } from "@/lib/utils"

type Tab = "margins" | "costs"

export default function PricingPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>("margins")

  const { data, isLoading } = useQuery<PricingConfig>({
    queryKey: ["pricing-config"],
    queryFn: getPricingConfig,
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    )
  }

  if (!data) return null

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pricing-config"] })

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Định giá</h1>
        <p className="text-xs text-muted-foreground mb-3">Giá = Nhập × (1 + Lợi nhuận%)</p>
        <div className="flex gap-1">
          {(["margins", "costs"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent",
              ].join(" ")}
            >
              {t === "margins" ? "Lợi nhuận" : "Giá nhập"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "margins" && <MarginsTab data={data} onSaved={invalidate} />}
        {tab === "costs" && <CostsTab data={data} onSaved={invalidate} />}
      </div>
    </div>
  )
}

// ── Margins Tab ──────────────────────────────────────────────────────────────
function MarginsTab({ data, onSaved }: { data: PricingConfig; onSaved: () => void }) {
  const [profits, setProfits] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    const init: Record<string, Record<string, number>> = {}
    for (const cat of data.categories) init[cat.id] = { ...cat.tier_profit }
    setProfits(init)
  }, [data.categories])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveCategoryMargins(
        data.categories.map((cat) => ({
          category_id: cat.id,
          tier_profit: profits[cat.id] ?? cat.tier_profit,
        }))
      ),
    onSuccess: () => { toast.success("Đã lưu lợi nhuận"); onSaved() },
    onError: () => toast.error("Lỗi lưu"),
  })

  const set = (catId: string, tierId: string, v: string) => {
    const n = parseInt(v, 10)
    setProfits((prev) => ({ ...prev, [catId]: { ...(prev[catId] ?? {}), [tierId]: isNaN(n) ? 0 : n } }))
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Nếu danh mục chưa được cấu hình, giá trị mặc định sẽ được áp dụng.
      </p>

      {/* Mobile: vertical cards */}
      <div className="space-y-3 md:hidden">
        {/* Default row */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Mặc định</span>
            <Badge variant="secondary">fallback</Badge>
          </div>
          <div className="space-y-1">
            {data.tiers.map((tier) => (
              <div key={tier.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tier.label}</span>
                <span>{data.default_profit[tier.id] ?? "—"}%</span>
              </div>
            ))}
          </div>
        </div>

        {data.categories.map((cat) => (
          <div key={cat.id} className="rounded-lg border p-3">
            <p className="text-sm font-medium mb-2">{cat.name}</p>
            <div className="space-y-2">
              {data.tiers.map((tier) => (
                <div key={tier.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{tier.label}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={999}
                      className="h-8 w-20 text-center text-sm"
                      value={profits[cat.id]?.[tier.id] ?? ""}
                      onChange={(e) => set(cat.id, tier.id, e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Danh mục</th>
              {data.tiers.map((t) => (
                <th key={t.id} className="px-4 py-3 text-center font-medium text-muted-foreground">{t.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="bg-muted/20">
              <td className="px-4 py-3 flex items-center gap-2">
                <span className="font-medium">Mặc định</span>
                <Badge variant="secondary" className="text-xs">fallback</Badge>
              </td>
              {data.tiers.map((t) => (
                <td key={t.id} className="px-4 py-3 text-center text-muted-foreground">
                  {data.default_profit[t.id] ?? "—"}%
                </td>
              ))}
            </tr>
            {data.categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                {data.tiers.map((tier) => (
                  <td key={tier.id} className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        className="h-8 w-20 text-center"
                        value={profits[cat.id]?.[tier.id] ?? ""}
                        onChange={(e) => set(cat.id, tier.id, e.target.value)}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Đang lưu..." : "Lưu lợi nhuận"}
        </Button>
      </div>
    </div>
  )
}

// ── Costs Tab ────────────────────────────────────────────────────────────────
function CostsTab({ data, onSaved }: { data: PricingConfig; onSaved: () => void }) {
  const [costs, setCosts] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  useEffect(() => {
    const init: Record<string, string> = {}
    for (const prod of data.products) init[prod.id] = rubles(prod.cost)
    setCosts(init)
    setDirty(new Set())
  }, [data.products])

  const setCost = (prodId: string, value: string) => {
    setCosts((prev) => ({ ...prev, [prodId]: value }))
    setDirty((prev) => new Set(prev).add(prodId))
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      saveProductCosts(
        [...dirty].map((id) => ({ product_id: id, cost: toKopecks(costs[id] ?? "0") }))
      ),
    onSuccess: () => { toast.success("Đã lưu giá nhập"); setDirty(new Set()); onSaved() },
    onError: () => toast.error("Lỗi lưu"),
  })

  const syncMutation = useMutation({
    mutationFn: syncPrices,
    onSuccess: (r) => {
      toast.success(`Đã đồng bộ: ${r.updated} cập nhật, ${r.created} tạo mới`)
      onSaved()
    },
    onError: () => toast.error("Lỗi đồng bộ"),
  })

  function getPreview(prod: typeof data.products[0], tierId: string): string {
    const cost = toKopecks(costs[prod.id] ?? "0")
    if (!cost) return "—"
    const catConfig = data.categories.find((c) => c.id === prod.category_id)
    const profit = catConfig?.tier_profit?.[tierId] ?? data.default_profit[tierId] ?? 30
    return formatRub(Math.round(cost * (1 + profit / 100)))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Nhập giá nhập hàng.</p>
        <Button
          size="sm"
          variant="outline"
          disabled={syncMutation.isPending || dirty.size > 0}
          title={dirty.size > 0 ? "Lưu thay đổi trước" : undefined}
          onClick={() => syncMutation.mutate()}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Đồng bộ
        </Button>
      </div>

      {/* Mobile: vertical cards */}
      <div className="space-y-3 md:hidden">
        {data.products.map((prod) => (
          <div key={prod.id} className="rounded-lg border p-3">
            <div className="flex items-start gap-2 mb-2">
              {prod.thumbnail ? (
                <img src={prod.thumbnail} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{prod.title}</p>
                <p className="text-xs text-muted-foreground">{prod.category_name ?? "—"}</p>
              </div>
              {dirty.has(prod.id) && <Badge variant="warning">đã sửa</Badge>}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Input
                type="number"
                min={0}
                placeholder="Nhập ₽"
                className="h-8 flex-1 text-sm"
                value={costs[prod.id] ?? ""}
                onChange={(e) => setCost(prod.id, e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {data.tiers.map((tier) => (
                <div key={tier.id} className="text-center">
                  <p className="text-muted-foreground truncate">{tier.label}</p>
                  <p className="font-medium">{getPreview(prod, tier.id)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground" colSpan={2}>Sản phẩm</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Danh mục</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Nhập (₽)</th>
              {data.tiers.map((t) => (
                <th key={t.id} className="px-4 py-3 text-center font-medium text-muted-foreground">{t.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.products.map((prod) => (
              <tr key={prod.id} className="hover:bg-accent/50">
                <td className="px-4 py-3 w-12">
                  {prod.thumbnail ? (
                    <img src={prod.thumbnail} alt="" className="h-9 w-9 rounded object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded bg-muted" />
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium line-clamp-1">{prod.title}</span>
                    {dirty.has(prod.id) && <Badge variant="warning" className="text-[10px] shrink-0">đã sửa</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{prod.category_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-8 w-28 text-center mx-auto block"
                    value={costs[prod.id] ?? ""}
                    onChange={(e) => setCost(prod.id, e.target.value)}
                  />
                </td>
                {data.tiers.map((tier) => (
                  <td key={tier.id} className="px-4 py-3 text-center text-sm">
                    {getPreview(prod, tier.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saveMutation.isPending || dirty.size === 0}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Đang lưu..." : dirty.size > 0 ? `Lưu (${dirty.size})` : "Lưu"}
        </Button>
      </div>
    </div>
  )
}

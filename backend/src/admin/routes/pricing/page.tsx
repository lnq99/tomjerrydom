import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button, Heading, Text, Input, toast, Badge, Container } from "@medusajs/ui"
import { CurrencyDollar } from "@medusajs/icons"
import { sdk } from "../../lib/sdk"

export const config = defineRouteConfig({
  label: "Ценообразование",
  icon: CurrencyDollar,
})

// ── Types ──────────────────────────────────────────────────────────────────
type Tier = { id: string; label: string; min_order_amount: number; sort_order: number }

type CategoryConfig = {
  id: string
  name: string
  tier_profit: Record<string, number>
}

type ProductConfig = {
  id: string
  title: string
  thumbnail: string | null
  capital: number
  category_id: string | null
  category_name: string | null
  calculated_prices: Record<string, number>
}

type PricingData = {
  tiers: Tier[]
  default_profit: Record<string, number>
  categories: CategoryConfig[]
  products: ProductConfig[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatRub(kopecks: number) {
  if (!kopecks) return "—"
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}

function toRub(kopecks: number): string {
  return kopecks ? String(Math.round(kopecks / 100)) : ""
}

function toKopecks(rubles: string): number {
  const n = parseFloat(rubles.replace(",", "."))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PricingPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PricingData>({
    queryKey: ["pricing-config"],
    queryFn: () => sdk.client.fetch("/admin/pricing-config"),
  })

  const [activeTab, setActiveTab] = useState<"margins" | "products">("margins")

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Text className="text-ui-fg-muted">Загрузка...</Text>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <Heading level="h1">Ценообразование</Heading>
        <Text size="small" className="text-ui-fg-muted">
          Цена = Закупка × (1 + Наценка%)
        </Text>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ui-border-base">
        {(["margins", "products"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-ui-fg-base text-ui-fg-base"
                : "border-transparent text-ui-fg-muted hover:text-ui-fg-subtle",
            ].join(" ")}
          >
            {tab === "margins" ? "Наценки по категориям" : "Закупочные цены"}
          </button>
        ))}
      </div>

      {activeTab === "margins" && (
        <MarginsTab data={data} onSaved={() => qc.invalidateQueries({ queryKey: ["pricing-config"] })} />
      )}
      {activeTab === "products" && (
        <ProductsTab data={data} onSaved={() => qc.invalidateQueries({ queryKey: ["pricing-config"] })} />
      )}
    </div>
  )
}

// ── Margins Tab ────────────────────────────────────────────────────────────
function MarginsTab({ data, onSaved }: { data: PricingData; onSaved: () => void }) {
  const [profits, setProfits] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    const init: Record<string, Record<string, number>> = {}
    for (const cat of data.categories) {
      init[cat.id] = { ...cat.tier_profit }
    }
    setProfits(init)
  }, [data.categories])

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/pricing-config", {
        method: "POST",
        body: {
          updates: data.categories.map((cat) => ({
            category_id: cat.id,
            tier_profit: profits[cat.id] ?? cat.tier_profit,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Наценки сохранены")
      onSaved()
    },
    onError: () => toast.error("Ошибка сохранения"),
  })

  const setProfit = (catId: string, tierId: string, value: string) => {
    const n = parseInt(value, 10)
    setProfits((prev) => ({
      ...prev,
      [catId]: { ...(prev[catId] ?? {}), [tierId]: isNaN(n) ? 0 : n },
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <Text className="text-ui-fg-muted" size="small">
        Наценка в процентах поверх закупочной цены. Если категория не настроена — применяется значение по умолчанию.
      </Text>

      <Container className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ui-bg-subtle border-b border-ui-border-base">
              <th className="px-4 py-3 text-left font-medium text-ui-fg-subtle">Категория</th>
              {data.tiers.map((tier) => (
                <th key={tier.id} className="px-4 py-3 text-center font-medium text-ui-fg-subtle">
                  {tier.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-base">
            {/* Default row */}
            <tr className="bg-ui-bg-subtle/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Text size="small" weight="plus">По умолчанию</Text>
                  <Badge size="xsmall" color="grey">fallback</Badge>
                </div>
              </td>
              {data.tiers.map((tier) => (
                <td key={tier.id} className="px-4 py-3 text-center">
                  <Text size="small" className="text-ui-fg-muted">{data.default_profit[tier.id] ?? "—"}%</Text>
                </td>
              ))}
            </tr>
            {data.categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-ui-bg-base-hover">
                <td className="px-4 py-3">
                  <Text size="small">{cat.name}</Text>
                </td>
                {data.tiers.map((tier) => (
                  <td key={tier.id} className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        className="w-20 text-center"
                        value={profits[cat.id]?.[tier.id] ?? cat.tier_profit[tier.id] ?? ""}
                        onChange={(e) => setProfit(cat.id, tier.id, e.target.value)}
                      />
                      <Text size="small" className="text-ui-fg-muted">%</Text>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Container>

      <div className="flex justify-end">
        <Button
          size="small"
          isLoading={saveMutation.isPending}
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Сохранить наценки
        </Button>
      </div>
    </div>
  )
}

// ── Products Tab ───────────────────────────────────────────────────────────
function ProductsTab({ data, onSaved }: { data: PricingData; onSaved: () => void }) {
  const [capitals, setCapitals] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  useEffect(() => {
    const init: Record<string, string> = {}
    for (const prod of data.products) {
      init[prod.id] = toRub(prod.capital)
    }
    setCapitals(init)
    setDirty(new Set())
  }, [data.products])

  const setCapital = (prodId: string, value: string) => {
    setCapitals((prev) => ({ ...prev, [prodId]: value }))
    setDirty((prev) => new Set(prev).add(prodId))
  }

  const saveProductsMutation = useMutation({
    mutationFn: () => {
      const updates = [...dirty].map((prodId) => ({
        product_id: prodId,
        capital: toKopecks(capitals[prodId] ?? "0"),
      }))
      return sdk.client.fetch("/admin/pricing-config/products", {
        method: "POST",
        body: { updates },
      })
    },
    onSuccess: () => {
      toast.success("Закупочные цены сохранены")
      setDirty(new Set())
      onSaved()
    },
    onError: () => toast.error("Ошибка сохранения"),
  })

  const syncMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/pricing-config/sync", { method: "POST" }) as Promise<{
        updated: number; created: number; skipped: number
      }>,
    onSuccess: (result) => {
      toast.success(`Синхронизировано: обновлено ${result.updated}, создано ${result.created}, пропущено ${result.skipped}`)
      onSaved()
    },
    onError: () => toast.error("Ошибка синхронизации"),
  })

  // Live price preview based on current capital input + stored category profit
  function getPreviewPrice(prod: ProductConfig, tierId: string): string {
    const cap = toKopecks(capitals[prod.id] ?? "0")
    if (!cap) return "—"
    // Find category profit for this tier
    const cat = data.categories.find((c) => c.id === prod.category_id)
    const profit = cat?.tier_profit?.[tierId] ?? data.default_profit[tierId] ?? 30
    const price = Math.round(cap * (1 + profit / 100))
    return formatRub(price)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Text className="text-ui-fg-muted" size="small">
          Введите закупочную цену в рублях. Цены продажи пересчитываются автоматически.
        </Text>
        <Button
          variant="secondary"
          size="small"
          isLoading={syncMutation.isPending}
          disabled={syncMutation.isPending || dirty.size > 0}
          title={dirty.size > 0 ? "Сначала сохраните изменения" : "Записать розничные цены в Medusa"}
          onClick={() => syncMutation.mutate()}
        >
          Синхронизировать цены Medusa
        </Button>
      </div>

      <Container className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ui-bg-subtle border-b border-ui-border-base">
              <th className="px-4 py-3 text-left font-medium text-ui-fg-subtle">Товар</th>
              <th className="px-4 py-3 text-left font-medium text-ui-fg-subtle">Категория</th>
              <th className="px-4 py-3 text-center font-medium text-ui-fg-subtle">Закупка (₽)</th>
              {data.tiers.map((tier) => (
                <th key={tier.id} className="px-4 py-3 text-center font-medium text-ui-fg-subtle">
                  {tier.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-base">
            {data.products.map((prod) => (
              <tr key={prod.id} className="hover:bg-ui-bg-base-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {prod.thumbnail ? (
                      <img src={prod.thumbnail} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-ui-bg-subtle shrink-0" />
                    )}
                    <Text size="small" className="line-clamp-1">{prod.title}</Text>
                    {dirty.has(prod.id) && <Badge size="xsmall" color="orange">изм.</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Text size="small" className="text-ui-fg-muted">{prod.category_name ?? "—"}</Text>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="w-28 text-center mx-auto block"
                    value={capitals[prod.id] ?? ""}
                    onChange={(e) => setCapital(prod.id, e.target.value)}
                  />
                </td>
                {data.tiers.map((tier) => (
                  <td key={tier.id} className="px-4 py-3 text-center">
                    <Text size="small">{getPreviewPrice(prod, tier.id)}</Text>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Container>

      <div className="flex justify-end">
        <Button
          size="small"
          isLoading={saveProductsMutation.isPending}
          disabled={saveProductsMutation.isPending || dirty.size === 0}
          onClick={() => saveProductsMutation.mutate()}
        >
          {dirty.size > 0 ? `Сохранить (${dirty.size})` : "Сохранить"}
        </Button>
      </div>
    </div>
  )
}

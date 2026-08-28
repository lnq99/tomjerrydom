"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, LayoutGrid, List, Minus, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listProducts, type AdminProduct, type AdminVariant, type PricingConfig } from "@/lib/api"
import { formatRub, cn } from "@/lib/utils"
import type { LineItem } from "@/lib/cart"

type Tier = { id: string; label: string; min_order_amount: number }
type PricedProduct = {
  id: string
  title: string
  thumbnail: string | null
  cost: number
  calculated_prices: Record<string, number>
}

type Props = {
  tierId: string
  tiers: Tier[]
  pricingData: PricingConfig | null
  onAddItem: (item: LineItem) => void
}

/** "Оптом от 20 000 ₽" → "Опт 20к", retail stays as-is */
function shortLabel(tier: Tier): string {
  if (tier.min_order_amount === 0) return tier.label
  const rubles = tier.min_order_amount / 100
  const k = rubles >= 1000 ? `${Math.round(rubles / 1000)}к` : String(rubles)
  return `Опт ${k}`
}

export function ProductSearch({ tierId, tiers, pricingData, onAddItem }: Props) {
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"cards" | "list">("cards")
  const [pickerProduct, setPickerProduct] = useState<AdminProduct | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () => listProducts({ q: search || undefined, limit: 100 }),
    staleTime: 30_000,
  })

  const products = data?.products ?? []

  const priceMap = useMemo<Map<string, PricedProduct>>(() => {
    const map = new Map<string, PricedProduct>()
    for (const p of pricingData?.products ?? []) map.set(p.id, p)
    return map
  }, [pricingData])

  function tierPrice(productId: string): number {
    return priceMap.get(productId)?.calculated_prices[tierId] ?? 0
  }

  function productCost(productId: string): number {
    return priceMap.get(productId)?.cost ?? 0
  }

  function addVariant(product: AdminProduct, variant: AdminVariant, qty = 1) {
    onAddItem({
      variantId: variant.id,
      productId: product.id,
      variantTitle: variant.title,
      productTitle: product.title,
      thumbnail: product.thumbnail,
      unitPrice: tierPrice(product.id),
      quantity: qty,
    })
  }

  function handleTap(product: AdminProduct) {
    const variants = product.variants ?? []
    if (variants.length <= 1) {
      addVariant(product, variants[0] ?? { id: product.id, title: product.title, sku: null, prices: [] })
    } else {
      setPickerProduct(product)
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search + view toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск товаров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-md border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={cn(
              "px-2.5 py-2 transition-colors",
              view === "cards" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "px-2.5 py-2 transition-colors",
              view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div>
      )}

      {!isLoading && products.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Ничего не найдено</div>
      )}

      {/* Cards */}
      {!isLoading && view === "cards" && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 flex-1 overflow-y-auto content-start">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              tiers={tiers}
              tierId={tierId}
              tierPrice={tierPrice(p.id)}
              cost={productCost(p.id)}
              allPrices={priceMap.get(p.id)?.calculated_prices ?? {}}
              onTap={handleTap}
            />
          ))}
        </div>
      )}

      {/* List */}
      {!isLoading && view === "list" && products.length > 0 && (
        <div className="flex-1 overflow-y-auto rounded-lg border">
          <div
            className="grid border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sticky top-0"
            style={{ gridTemplateColumns: `auto 1fr 80px ${tiers.map(() => "72px").join(" ")} 36px` }}
          >
            <div className="w-9 mr-3" />
            <div>Товар</div>
            <div className="text-right">Себест.</div>
            {tiers.map((t) => (
              <div key={t.id} className={cn("text-right", t.id === tierId ? "text-primary font-semibold" : "")}>
                {shortLabel(t)}
              </div>
            ))}
            <div />
          </div>
          {products.map((product) => {
            const priced = priceMap.get(product.id)
            const cost = priced?.cost ?? 0
            const calcPrices = priced?.calculated_prices ?? {}
            const variantCount = product.variants?.length ?? 0
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => handleTap(product)}
                className="w-full grid items-center px-3 py-2 border-b last:border-b-0 hover:bg-accent transition-colors text-left"
                style={{ gridTemplateColumns: `auto 1fr 80px ${tiers.map(() => "72px").join(" ")} 36px` }}
              >
                <div className="mr-3">
                  {product.thumbnail
                    ? <img src={product.thumbnail} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                    : <div className="h-9 w-9 rounded bg-muted shrink-0" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  {variantCount > 1 && <p className="text-xs text-muted-foreground">{variantCount} вар.</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">{cost ? formatRub(cost) : "—"}</div>
                {tiers.map((t) => (
                  <div key={t.id} className={cn("text-right text-sm", t.id === tierId ? "font-semibold" : "text-muted-foreground")}>
                    {calcPrices[t.id] ? formatRub(calcPrices[t.id]) : "—"}
                  </div>
                ))}
                <div className="flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">→</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {pickerProduct && (
        <VariantPicker
          product={pickerProduct}
          tierPrice={tierPrice(pickerProduct.id)}
          onConfirm={(picks) => {
            picks.forEach(({ variant, qty }) => addVariant(pickerProduct, variant, qty))
            setPickerProduct(null)
          }}
          onClose={() => setPickerProduct(null)}
        />
      )}
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, tiers, tierId, tierPrice, cost, allPrices, onTap }: {
  product: AdminProduct
  tiers: Tier[]
  tierId: string
  tierPrice: number
  cost: number
  allPrices: Record<string, number>
  onTap: (p: AdminProduct) => void
}) {
  const variantCount = product.variants?.length ?? 0
  const otherTiers = tiers.filter((t) => t.id !== tierId)

  return (
    <button
      type="button"
      onClick={() => onTap(product)}
      className="flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-accent active:scale-95"
    >
      {product.thumbnail
        ? <img src={product.thumbnail} alt={product.title} className="aspect-square w-full object-cover" />
        : <div className="aspect-square w-full bg-muted" />}
      <div className="flex flex-col gap-0.5 p-2">
        <span className="text-xs font-medium line-clamp-2 leading-snug">{product.title}</span>
        {variantCount > 1 && <span className="text-[10px] text-muted-foreground">{variantCount} вар. →</span>}
        {tierPrice
          ? <span className="text-sm font-bold mt-0.5">{formatRub(tierPrice)}</span>
          : <span className="text-xs text-muted-foreground mt-0.5">нет цены</span>}
        {cost > 0 && <span className="text-[10px] text-muted-foreground">себ. {formatRub(cost)}</span>}
        {otherTiers.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5 border-t pt-1">
            {otherTiers.map((t) => (
              <div key={t.id} className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground truncate">{shortLabel(t)}</span>
                <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                  {allPrices[t.id] ? formatRub(allPrices[t.id]) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Variant picker ────────────────────────────────────────────────────────────

function VariantPicker({ product, tierPrice, onConfirm, onClose }: {
  product: AdminProduct
  tierPrice: number
  onConfirm: (picks: { variant: AdminVariant; qty: number }[]) => void
  onClose: () => void
}) {
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries((product.variants ?? []).map((v) => [v.id, 0]))
  )

  function adjust(variantId: string, delta: number) {
    setQtys((prev) => ({ ...prev, [variantId]: Math.max(0, (prev[variantId] ?? 0) + delta) }))
  }

  function handleConfirm() {
    const picks = (product.variants ?? [])
      .filter((v) => (qtys[v.id] ?? 0) > 0)
      .map((v) => ({ variant: v, qty: qtys[v.id] }))
    if (picks.length > 0) onConfirm(picks)
  }

  const totalQty = Object.values(qtys).reduce((s, q) => s + q, 0)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {product.thumbnail && (
              <img src={product.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
            )}
            <div>
              <DialogTitle>{product.title}</DialogTitle>
              {tierPrice > 0 && (
                <p className="text-sm text-muted-foreground">{formatRub(tierPrice)} / шт.</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {(product.variants ?? []).map((variant) => {
            const qty = qtys[variant.id] ?? 0
            return (
              <div key={variant.id} className="flex items-center px-4 py-3 gap-3">
                <span className="flex-1 text-sm font-medium">{variant.title}</span>
                {qty > 0 && tierPrice > 0 && (
                  <span className="text-sm font-semibold text-emerald-500 shrink-0">
                    {formatRub(tierPrice * qty)}
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => adjust(variant.id, -1)}
                    disabled={qty === 0}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => adjust(variant.id, +1)}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          className="w-full"
          disabled={totalQty === 0}
          onClick={handleConfirm}
        >
          {totalQty > 0 ? `Добавить (${totalQty} шт.)` : "Выберите количество"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

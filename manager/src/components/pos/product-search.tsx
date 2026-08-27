"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, LayoutGrid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listProducts, type AdminProduct, type AdminVariant, type PricingConfig } from "@/lib/api"
import { formatRub, cn } from "@/lib/utils"
import type { LineItem } from "@/lib/cart"

type Tier = { id: string; label: string }
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

  // Build price map: productId → { cost, calculated_prices }
  const priceMap = useMemo<Map<string, PricedProduct>>(() => {
    const map = new Map<string, PricedProduct>()
    for (const p of pricingData?.products ?? []) {
      map.set(p.id, p)
    }
    return map
  }, [pricingData])

  function tierPrice(productId: string): number {
    return priceMap.get(productId)?.calculated_prices[tierId] ?? 0
  }

  function productCost(productId: string): number {
    return priceMap.get(productId)?.cost ?? 0
  }

  function addProduct(product: AdminProduct, variant: AdminVariant) {
    onAddItem({
      variantId: variant.id,
      variantTitle: variant.title,
      productTitle: product.title,
      thumbnail: product.thumbnail,
      unitPrice: tierPrice(product.id),
      quantity: 1,
    })
  }

  function handleTap(product: AdminProduct) {
    const variants = product.variants ?? []
    if (variants.length <= 1) {
      addProduct(product, variants[0] ?? { id: product.id, title: product.title, sku: null, prices: [] })
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

      {/* Cards view */}
      {!isLoading && view === "cards" && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 flex-1 overflow-y-auto content-start">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              tiers={tiers}
              tierId={tierId}
              tierPrice={tierPrice(product.id)}
              cost={productCost(product.id)}
              allPrices={priceMap.get(product.id)?.calculated_prices ?? {}}
              onTap={handleTap}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!isLoading && view === "list" && products.length > 0 && (
        <div className="flex-1 overflow-y-auto rounded-lg border">
          {/* Header */}
          <div className="grid border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sticky top-0"
            style={{ gridTemplateColumns: `auto 1fr 80px ${tiers.map(() => "80px").join(" ")} 36px` }}
          >
            <div className="w-9 mr-3" />
            <div>Товар</div>
            <div className="text-right">Себест.</div>
            {tiers.map((t) => (
              <div key={t.id} className={cn("text-right", t.id === tierId ? "text-primary font-semibold" : "")}>
                {t.label}
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
                style={{ gridTemplateColumns: `auto 1fr 80px ${tiers.map(() => "80px").join(" ")} 36px` }}
              >
                {/* Thumbnail */}
                <div className="mr-3">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded bg-muted shrink-0" />
                  )}
                </div>

                {/* Title */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  {variantCount > 1 && (
                    <p className="text-xs text-muted-foreground">{variantCount} вар.</p>
                  )}
                </div>

                {/* Cost */}
                <div className="text-right text-xs text-muted-foreground">
                  {cost ? formatRub(cost) : "—"}
                </div>

                {/* Tier prices */}
                {tiers.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "text-right text-sm",
                      t.id === tierId ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {calcPrices[t.id] ? formatRub(calcPrices[t.id]) : "—"}
                  </div>
                ))}

                {/* Add indicator */}
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
          tiers={tiers}
          tierId={tierId}
          priceMap={priceMap}
          onPick={(variant) => {
            addProduct(pickerProduct, variant)
            setPickerProduct(null)
          }}
          onClose={() => setPickerProduct(null)}
        />
      )}
    </div>
  )
}

// ── Product card (grid view) ──────────────────────────────────────────────────

function ProductCard({
  product, tiers, tierId, tierPrice, cost, onTap,
}: {
  product: AdminProduct
  tiers: Tier[]
  tierId: string
  tierPrice: number
  cost: number
  onTap: (p: AdminProduct) => void
}) {
  const variantCount = product.variants?.length ?? 0

  return (
    <button
      type="button"
      onClick={() => onTap(product)}
      className="flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-accent active:scale-95"
    >
      {product.thumbnail ? (
        <img src={product.thumbnail} alt={product.title} className="aspect-square w-full object-cover" />
      ) : (
        <div className="aspect-square w-full bg-muted" />
      )}
      <div className="flex flex-col gap-1 p-2">
        <span className="text-xs font-medium line-clamp-2 leading-snug">{product.title}</span>
        {variantCount > 1 && (
          <span className="text-[10px] text-muted-foreground">{variantCount} вар. →</span>
        )}
        {/* Selected tier price */}
        {tierPrice ? (
          <span className="text-sm font-bold">{formatRub(tierPrice)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">нет цены</span>
        )}
        {/* Cost */}
        {cost > 0 && (
          <span className="text-[10px] text-muted-foreground">себ. {formatRub(cost)}</span>
        )}
        {/* All tier prices (compact row) */}
        {tiers.length > 1 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {tiers.filter((t) => t.id !== tierId).map((t) => {
              const p = product ? undefined : undefined // placeholder — prices passed via props
              return null // rendered below
            })}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Variant picker dialog ─────────────────────────────────────────────────────

function VariantPicker({
  product, tiers, tierId, priceMap, onPick, onClose,
}: {
  product: AdminProduct
  tiers: Tier[]
  tierId: string
  priceMap: Map<string, PricedProduct>
  onPick: (v: AdminVariant) => void
  onClose: () => void
}) {
  const priced = priceMap.get(product.id)
  const tierPrice = priced?.calculated_prices[tierId] ?? 0
  const cost = priced?.cost ?? 0

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
              <p className="text-sm text-muted-foreground">Выберите вариант</p>
            </div>
          </div>
        </DialogHeader>

        {/* Price summary for this product */}
        <div className="grid gap-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          {cost > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Себестоимость</span>
              <span>{formatRub(cost)}</span>
            </div>
          )}
          {tiers.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex justify-between",
                t.id === tierId ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              <span>{t.label}{t.id === tierId ? " ✓" : ""}</span>
              <span>{priced?.calculated_prices[t.id] ? formatRub(priced.calculated_prices[t.id]) : "—"}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {(product.variants ?? []).map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => onPick(variant)}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-accent transition-colors"
            >
              <div>
                <span className="text-sm font-medium">{variant.title}</span>
                {variant.sku && (
                  <span className="block text-xs text-muted-foreground">SKU: {variant.sku}</span>
                )}
              </div>
              <span className="text-sm font-semibold shrink-0">
                {tierPrice ? formatRub(tierPrice) : "нет цены"}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

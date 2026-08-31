"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, LayoutGrid, List, SlidersHorizontal } from "lucide-react"
import { QtyControl } from "@/components/pos/qty-control"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listProducts, getVariantStock, type AdminProduct, type AdminVariant, type PricingConfig } from "@/lib/api"
import { formatRub, cn } from "@/lib/utils"
import { useSensitive } from "@/lib/sensitive-context"
import type { LineItem } from "@/lib/cart"

type Tier = { id: string; label: string; min_order_amount: number }
type PricedProduct = {
  id: string; title: string; thumbnail: string | null
  cost: number; calculated_prices: Record<string, number>
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc"
type PosFilter = { categoryId: string | null; sort: SortOption }
const DEFAULT_FILTER: PosFilter = { categoryId: null, sort: "name-asc" }

type Props = {
  tierId: string
  tiers: Tier[]
  pricingData: PricingConfig | null
  onAddItem: (item: LineItem) => void
}

function shortLabel(tier: Tier): string {
  if (tier.min_order_amount === 0) return tier.label
  const rubles = tier.min_order_amount / 100
  const k = rubles >= 1000 ? `${Math.round(rubles / 1000)}k` : String(rubles)
  return `Sỉ ${k}`
}

export function ProductSearch({ tierId, tiers, pricingData, onAddItem }: Props) {
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"cards" | "list">("cards")
  const { show: showSensitive } = useSensitive()
  const [pickerProduct, setPickerProduct] = useState<AdminProduct | null>(null)
  const [posFilter, setPosFilter] = useState<PosFilter>(DEFAULT_FILTER)
  const [filterOpen, setFilterOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () => listProducts({ q: search || undefined, limit: 100 }),
    staleTime: 30_000,
  })

  const priceMap = useMemo<Map<string, PricedProduct>>(() => {
    const map = new Map<string, PricedProduct>()
    for (const p of pricingData?.products ?? []) map.set(p.id, p)
    return map
  }, [pricingData])

  // Derive unique categories from loaded products
  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of data?.products ?? []) {
      for (const c of p.categories ?? []) map.set(c.id, c.name)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  const products = useMemo(() => {
    let list = (data?.products ?? []).filter((p) => {
      if (p.status !== "published") return false
      if (pricingData !== null) {
        const price = priceMap.get(p.id)?.calculated_prices[tierId] ?? 0
        if (price === 0) return false
      }
      if (posFilter.categoryId) {
        if (!p.categories?.some((c) => c.id === posFilter.categoryId)) return false
      }
      return true
    })
    const sort = posFilter.sort
    list = [...list].sort((a, b) => {
      if (sort === "name-asc") return a.title.localeCompare(b.title)
      if (sort === "name-desc") return b.title.localeCompare(a.title)
      const pa = priceMap.get(a.id)?.calculated_prices[tierId] ?? 0
      const pb = priceMap.get(b.id)?.calculated_prices[tierId] ?? 0
      return sort === "price-asc" ? pa - pb : pb - pa
    })
    return list
  }, [data, pricingData, priceMap, tierId, posFilter])

  const activeFilters = (posFilter.categoryId ? 1 : 0) + (posFilter.sort !== "name-asc" ? 1 : 0)

  function tierPrice(productId: string) { return priceMap.get(productId)?.calculated_prices[tierId] ?? 0 }
  function productCost(productId: string) { return priceMap.get(productId)?.cost ?? 0 }

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
    const variants = (product.variants ?? []).filter((v) => !v.metadata?.disabled)
    if (variants.length <= 1) {
      addVariant(product, variants[0] ?? { id: product.id, title: product.title, sku: null, prices: [] })
    } else {
      setPickerProduct(product)
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search bar + view toggle + filter */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm kiếm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex rounded-md border overflow-hidden shrink-0">
          <button type="button" onClick={() => setView("cards")}
            className={cn("px-2.5 py-2 transition-colors", view === "cards" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setView("list")}
            className={cn("px-2.5 py-2 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent")}>
            <List className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={() => setFilterOpen(true)}
          className="relative rounded-md border px-2.5 py-2 transition-colors bg-background text-muted-foreground hover:bg-accent shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {isLoading && <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Đang tải...</div>}
      {!isLoading && products.length === 0 && <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Không tìm thấy</div>}

      {!isLoading && view === "cards" && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 flex-1 overflow-y-auto content-start">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} tiers={tiers} tierId={tierId}
              tierPrice={tierPrice(p.id)} cost={productCost(p.id)} showCost={showSensitive}
              allPrices={priceMap.get(p.id)?.calculated_prices ?? {}} onTap={handleTap} />
          ))}
        </div>
      )}

      {!isLoading && view === "list" && products.length > 0 && (
        <div className="flex-1 overflow-y-auto rounded-lg border divide-y">
          {products.map((product) => {
            const priced = priceMap.get(product.id)
            const cost = priced?.cost ?? 0
            const calcPrices = priced?.calculated_prices ?? {}
            const currentPrice = calcPrices[tierId] ?? 0
            const otherTiers = tiers.filter((t) => t.id !== tierId)
            return (
              <button key={product.id} type="button" onClick={() => handleTap(product)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left">
                {product.thumbnail
                  ? <img src={product.thumbnail} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                  : <div className="h-12 w-12 rounded bg-muted shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{product.title}</p>
                  {(product.variants?.length ?? 0) > 1 && <p className="text-[10px] text-muted-foreground">{product.variants!.length} mẫu →</p>}
                  <div className="flex flex-wrap gap-x-2 mt-0.5">
                    {showSensitive && cost > 0 && <span className="text-[10px] text-muted-foreground">vốn: {formatRub(cost)}</span>}
                    {otherTiers.map((t) => calcPrices[t.id] ? (
                      <span key={t.id} className="text-[10px] text-muted-foreground">{shortLabel(t)}: {formatRub(calcPrices[t.id])}</span>
                    ) : null)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {currentPrice ? <span className="text-sm font-bold">{formatRub(currentPrice)}</span> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {pickerProduct && (
        <VariantPicker product={pickerProduct} tiers={tiers} tierId={tierId}
          allPrices={priceMap.get(pickerProduct.id)?.calculated_prices ?? {}}
          cost={productCost(pickerProduct.id)}
          onConfirm={(picks) => { picks.forEach(({ variant, qty }) => addVariant(pickerProduct, variant, qty)); setPickerProduct(null) }}
          onClose={() => setPickerProduct(null)} />
      )}

      <PosFilterModal
        open={filterOpen}
        filter={posFilter}
        categories={categories}
        onApply={(f) => { setPosFilter(f); setFilterOpen(false) }}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  )
}

// ── POS Filter Modal ──────────────────────────────────────────────────────────

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "name-asc",   label: "Tên A → Z" },
  { id: "name-desc",  label: "Tên Z → A" },
  { id: "price-asc",  label: "Giá tăng dần" },
  { id: "price-desc", label: "Giá giảm dần" },
]

function PosFilterModal({ open, filter, categories, onApply, onClose }: {
  open: boolean
  filter: PosFilter
  categories: { id: string; name: string }[]
  onApply: (f: PosFilter) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<PosFilter>(filter)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Lọc & Sắp xếp</DialogTitle></DialogHeader>

        <div className="space-y-5 py-1">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sắp xếp</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((s) => (
                <button key={s.id} type="button" onClick={() => setDraft((d) => ({ ...d, sort: s.id }))}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    draft.sort === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-accent")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Danh mục</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDraft((d) => ({ ...d, categoryId: null }))}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    !draft.categoryId ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-accent")}>
                  Tất cả
                </button>
                {categories.map((c) => (
                  <button key={c.id} type="button" onClick={() => setDraft((d) => ({ ...d, categoryId: c.id }))}
                    className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                      draft.categoryId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-accent")}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={() => setDraft(DEFAULT_FILTER)} className="flex-none">Đặt lại</Button>
          <Button onClick={() => onApply(draft)} className="flex-1">Áp dụng</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, tiers, tierId, tierPrice, cost, showCost, allPrices, onTap }: {
  product: AdminProduct; tiers: Tier[]; tierId: string
  tierPrice: number; cost: number; showCost: boolean; allPrices: Record<string, number>
  onTap: (p: AdminProduct) => void
}) {
  const otherTiers = tiers.filter((t) => t.id !== tierId)
  return (
    <button type="button" onClick={() => onTap(product)}
      className="flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-accent active:scale-95">
      {product.thumbnail
        ? <img src={product.thumbnail} alt={product.title} className="aspect-square w-full object-cover" />
        : <div className="aspect-square w-full bg-muted" />}
      <div className="flex flex-col gap-0.5 p-2">
        <span className="text-xs font-medium line-clamp-2 leading-snug">{product.title}</span>
        {(product.variants?.length ?? 0) > 1 && <span className="text-[10px] text-muted-foreground">{product.variants!.length} mẫu →</span>}
        <div className="flex items-baseline justify-between mt-0.5">
          {tierPrice ? <span className="text-sm font-bold">{formatRub(tierPrice)}</span> : <span className="text-xs text-muted-foreground">chưa có giá</span>}
          {showCost && cost > 0 && <span className="text-[10px] text-muted-foreground shrink-0 ml-1">vốn: {formatRub(cost)}</span>}
        </div>
        {otherTiers.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5 border-t pt-1">
            {otherTiers.map((t) => (
              <div key={t.id} className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground truncate">{shortLabel(t)}</span>
                <span className="text-[10px] text-muted-foreground ml-1 shrink-0">{allPrices[t.id] ? formatRub(allPrices[t.id]) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Variant Picker ────────────────────────────────────────────────────────────

function VariantPicker({ product, tiers, tierId, allPrices, cost, onConfirm, onClose }: {
  product: AdminProduct; tiers: Tier[]; tierId: string
  allPrices: Record<string, number>; cost: number
  onConfirm: (picks: { variant: AdminVariant; qty: number }[]) => void
  onClose: () => void
}) {
  const { show: showSensitive } = useSensitive()
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries((product.variants ?? []).map((v) => [v.id, 0]))
  )
  const variantIds = (product.variants ?? []).map((v) => v.id)
  const { data: stockData } = useQuery({
    queryKey: ["pos-variant-stock", ...variantIds],
    queryFn: () => getVariantStock(variantIds),
    staleTime: 30_000,
    enabled: variantIds.length > 0,
  })

  const totalQty = Object.values(qtys).reduce((s, q) => s + q, 0)
  const totalAmount = totalQty * (allPrices[tierId] ?? 0)
  const otherTiers = tiers.filter((t) => t.id !== tierId)

  function handleConfirm() {
    const picks = (product.variants ?? []).filter((v) => (qtys[v.id] ?? 0) > 0).map((v) => ({ variant: v, qty: qtys[v.id] }))
    if (picks.length > 0) onConfirm(picks)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {product.thumbnail && <img src={product.thumbnail} alt="" className="h-12 w-12 rounded object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">{product.title}</DialogTitle>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {tiers.map((t) => {
                  const p = allPrices[t.id]
                  return p ? (
                    <span key={t.id} className={cn("text-xs", t.id === tierId ? "font-bold text-primary" : "text-muted-foreground")}>
                      {shortLabel(t)}: {formatRub(p)}
                    </span>
                  ) : null
                })}
                {showSensitive && cost > 0 && <span className="text-xs text-muted-foreground">vốn: {formatRub(cost)}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {(product.variants ?? []).filter((v) => !v.metadata?.disabled).map((variant) => {
            const qty = qtys[variant.id] ?? 0
            const stock = stockData?.stock[variant.id]
            const managed = variant.manage_inventory !== false && stock !== null && stock !== undefined
            const outOfStock = managed && stock <= 0
            return (
              <div key={variant.id} className="flex items-center px-3 py-2.5 gap-3">
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", outOfStock && "text-muted-foreground")}>{variant.title}</p>
                  {managed && (
                    <p className={cn("text-xs", stock <= 0 ? "text-destructive" : stock <= 3 ? "text-amber-600" : "text-muted-foreground")}>
                      {stock <= 0 ? "Hết hàng" : `Còn ${stock}`}
                    </p>
                  )}
                </div>
                {qty > 0 && allPrices[tierId] > 0 && (
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">{formatRub(allPrices[tierId] * qty)}</span>
                )}
                <QtyControl value={qty} onChange={(n) => setQtys((prev) => ({ ...prev, [variant.id]: n }))} min={0} />
              </div>
            )
          })}
        </div>

        <Button className="w-full" disabled={totalQty === 0} onClick={handleConfirm}>
          {totalQty > 0 ? `Thêm ${totalQty} cái${totalAmount > 0 ? ` · ${formatRub(totalAmount)}` : ""}` : "Chọn số lượng"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { listProducts, type AdminProduct, type AdminVariant } from "@/lib/api"
import { formatRub } from "@/lib/utils"
import type { LineItem } from "@/lib/cart"

type Props = {
  onAddItem: (item: LineItem) => void
}

export function ProductSearch({ onAddItem }: Props) {
  const [search, setSearch] = useState("")
  const [pickerProduct, setPickerProduct] = useState<AdminProduct | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () => listProducts({ q: search || undefined, limit: 60 }),
    staleTime: 30_000,
  })

  const products = data?.products ?? []

  function rubPrice(variant: AdminVariant): number {
    return variant.prices?.find((p) => p.currency_code === "rub")?.amount ?? 0
  }

  function handleTap(product: AdminProduct) {
    const variants = product.variants ?? []
    if (variants.length === 1) {
      const v = variants[0]
      onAddItem({
        variantId: v.id,
        variantTitle: v.title,
        productTitle: product.title,
        thumbnail: product.thumbnail,
        unitPrice: rubPrice(v),
        quantity: 1,
      })
    } else {
      setPickerProduct(product)
    }
  }

  function handleVariantPick(product: AdminProduct, variant: AdminVariant) {
    onAddItem({
      variantId: variant.id,
      variantTitle: variant.title,
      productTitle: product.title,
      thumbnail: product.thumbnail,
      unitPrice: rubPrice(variant),
      quantity: 1,
    })
    setPickerProduct(null)
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Загрузка...
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 flex-1 overflow-y-auto content-start">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onTap={handleTap} />
        ))}
        {!isLoading && products.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-8 text-muted-foreground text-sm">
            Ничего не найдено
          </div>
        )}
      </div>

      {pickerProduct && (
        <VariantPicker
          product={pickerProduct}
          onPick={(v) => handleVariantPick(pickerProduct, v)}
          onClose={() => setPickerProduct(null)}
        />
      )}
    </div>
  )
}

function ProductCard({
  product,
  onTap,
}: {
  product: AdminProduct
  onTap: (p: AdminProduct) => void
}) {
  const variants = product.variants ?? []
  const firstVariant = variants[0]

  const price = useMemo(() => {
    if (variants.length !== 1 || !firstVariant) return null
    const p = firstVariant.prices?.find((px) => px.currency_code === "rub")?.amount
    return p != null ? formatRub(p) : null
  }, [firstVariant, variants.length])

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
      <div className="flex flex-col gap-0.5 p-2">
        <span className="text-xs font-medium line-clamp-2">{product.title}</span>
        {variants.length > 1 ? (
          <span className="text-xs text-muted-foreground">{variants.length} вар. →</span>
        ) : price ? (
          <span className="text-sm font-semibold">{price}</span>
        ) : null}
      </div>
    </button>
  )
}

function VariantPicker({
  product,
  onPick,
  onClose,
}: {
  product: AdminProduct
  onPick: (v: AdminVariant) => void
  onClose: () => void
}) {
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
        <div className="flex flex-col gap-2 mt-2">
          {(product.variants ?? []).map((variant) => {
            const amount = variant.prices?.find((p) => p.currency_code === "rub")?.amount
            return (
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
                  {amount != null ? formatRub(amount) : "нет цены"}
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

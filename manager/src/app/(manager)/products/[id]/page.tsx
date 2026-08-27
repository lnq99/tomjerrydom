"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getProduct } from "@/lib/api"
import { formatRub } from "@/lib/utils"

const STATUS_MAP: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "Опубликован", variant: "success" },
  draft:     { label: "Черновик",   variant: "secondary" },
  rejected:  { label: "Отклонён",   variant: "outline" },
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    staleTime: 30_000,
  })

  const product = data?.product

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold truncate">{product?.title ?? "Товар"}</h1>
        {product && (
          <Badge variant={(STATUS_MAP[product.status] ?? { variant: "outline" as const }).variant}>
            {STATUS_MAP[product.status]?.label ?? product.status}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Загрузка...</div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-40 text-destructive text-sm">Ошибка загрузки</div>
        )}
        {product && (
          <div className="p-4 space-y-6">
            {/* Image + meta */}
            <div className="flex gap-4">
              {product.thumbnail ? (
                <img
                  src={product.thumbnail}
                  alt=""
                  className="h-24 w-24 rounded-lg object-cover shrink-0 border"
                />
              ) : (
                <div className="h-24 w-24 rounded-lg bg-muted shrink-0 flex items-center justify-center border">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1">
                <p className="font-semibold text-lg leading-tight">{product.title}</p>
                {product.categories.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {product.categories.map((c) => c.name).join(", ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono">{product.id}</p>
              </div>
            </div>

            {/* Variants */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Варианты ({product.variants.length})
              </h2>
              {product.variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет вариантов</p>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {product.variants.map((v) => {
                    const rubPrice = v.prices?.find((p) => p.currency_code === "rub")
                    return (
                      <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          {v.sku && (
                            <p className="text-xs text-muted-foreground font-mono">SKU: {v.sku}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {rubPrice ? (
                            <p className="text-sm font-semibold">{formatRub(rubPrice.amount)}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">—</p>
                          )}
                          {v.inventory_quantity !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {v.inventory_quantity} на складе
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

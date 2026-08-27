"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { listProducts, type AdminProduct } from "@/lib/api"

const STATUS_MAP: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "Опубликован", variant: "success" },
  draft:     { label: "Черновик",   variant: "secondary" },
  rejected:  { label: "Отклонён",   variant: "outline" },
}

export default function ProductsPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Simple debounce
  function handleSearch(value: string) {
    setSearch(value)
    clearTimeout((window as any).__productSearchTimer)
    ;(window as any).__productSearchTimer = setTimeout(() => setDebouncedSearch(value), 300)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["products", debouncedSearch],
    queryFn: () => listProducts({ q: debouncedSearch || undefined, limit: 100 }),
    staleTime: 30_000,
  })

  const products = data?.products ?? []
  const count = data?.count ?? 0

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Товары</h1>
          <span className="text-sm text-muted-foreground">{count} шт.</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Загрузка...</div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Товаров не найдено</div>
        ) : (
          <>
            {/* Mobile: card list */}
            <ul className="divide-y md:hidden">
              {products.map((p) => <ProductRow key={p.id} product={p} />)}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12"></th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Товар</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Категория</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Варианты</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => <ProductTableRow key={p.id} product={p} />)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProductRow({ product }: { product: AdminProduct }) {
  const s = STATUS_MAP[product.status] ?? { label: product.status, variant: "outline" as const }
  const category = product.categories?.[0]?.name ?? "—"

  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
      {product.thumbnail ? (
        <img src={product.thumbnail} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
      ) : (
        <div className="h-12 w-12 rounded bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.title}</p>
        <p className="text-xs text-muted-foreground">{category} · {product.variants?.length ?? 0} вар.</p>
      </div>
      <Badge variant={s.variant}>{s.label}</Badge>
    </li>
  )
}

function ProductTableRow({ product }: { product: AdminProduct }) {
  const s = STATUS_MAP[product.status] ?? { label: product.status, variant: "outline" as const }
  const category = product.categories?.[0]?.name ?? "—"

  return (
    <tr className="hover:bg-accent/50 transition-colors">
      <td className="px-4 py-3">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 rounded bg-muted" />
        )}
      </td>
      <td className="px-4 py-3 font-medium">{product.title}</td>
      <td className="px-4 py-3 text-muted-foreground">{category}</td>
      <td className="px-4 py-3 text-muted-foreground">{product.variants?.length ?? 0} вар.</td>
      <td className="px-4 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
      <td className="px-4 py-3">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </td>
    </tr>
  )
}

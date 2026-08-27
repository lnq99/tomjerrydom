"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, ChevronRight, Plus } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { listProducts, updateProduct, saveProductCosts, type AdminProduct } from "@/lib/api"
import { formatRub, rubles, toKopecks } from "@/lib/utils"

const STATUS_MAP: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "Опубликован", variant: "success" },
  draft:     { label: "Черновик",   variant: "secondary" },
  rejected:  { label: "Отклонён",   variant: "outline" },
}

export default function ProductsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{count} шт.</span>
            <button
              type="button"
              onClick={() => router.push("/products/new")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Создать</span>
            </button>
          </div>
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Вар.</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Себест.</th>
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

// ── Mobile card ───────────────────────────────────────────────────────────────

function ProductRow({ product }: { product: AdminProduct }) {
  const router = useRouter()
  const qc = useQueryClient()
  const s = STATUS_MAP[product.status] ?? { label: product.status, variant: "outline" as const }
  const category = product.categories?.[0]?.name ?? "—"
  const cost = (product.metadata?.cost as number) ?? 0

  async function cycleStatus(e: React.MouseEvent) {
    e.stopPropagation()
    const order = ["draft", "published", "rejected"]
    const next = order[(order.indexOf(product.status) + 1) % order.length]
    try {
      await updateProduct(product.id, { status: next })
      qc.invalidateQueries({ queryKey: ["products"] })
    } catch {
      toast.error("Не удалось обновить статус")
    }
  }

  return (
    <li
      className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors cursor-pointer"
      onClick={() => router.push(`/products/${product.id}`)}
    >
      {product.thumbnail ? (
        <img src={product.thumbnail} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
      ) : (
        <div className="h-12 w-12 rounded bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.title}</p>
        <p className="text-xs text-muted-foreground">
          {category} · {product.variants?.length ?? 0} вар. · {cost ? formatRub(cost) : "—"}
        </p>
      </div>
      <button type="button" onClick={cycleStatus} title="Сменить статус">
        <Badge variant={s.variant}>{s.label}</Badge>
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </li>
  )
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function ProductTableRow({ product }: { product: AdminProduct }) {
  const router = useRouter()
  const qc = useQueryClient()
  const s = STATUS_MAP[product.status] ?? { label: product.status, variant: "outline" as const }
  const category = product.categories?.[0]?.name ?? "—"
  const cost = (product.metadata?.cost as number) ?? 0

  const [editingCost, setEditingCost] = useState(false)
  const [costVal, setCostVal] = useState(() => rubles(cost))
  const [savingCost, setSavingCost] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  // keep input in sync when query refetches
  useEffect(() => {
    if (!editingCost) setCostVal(rubles(cost))
  }, [cost, editingCost])

  async function saveCost() {
    setEditingCost(false)
    const newKopecks = toKopecks(costVal)
    if (newKopecks === cost) return
    setSavingCost(true)
    try {
      await saveProductCosts([{ product_id: product.id, cost: newKopecks }])
      qc.invalidateQueries({ queryKey: ["products"] })
    } catch {
      toast.error("Не удалось обновить себестоимость")
      setCostVal(rubles(cost))
    } finally {
      setSavingCost(false)
    }
  }

  async function saveStatus(newStatus: string) {
    setSavingStatus(true)
    try {
      await updateProduct(product.id, { status: newStatus })
      qc.invalidateQueries({ queryKey: ["products"] })
    } catch {
      toast.error("Не удалось обновить статус")
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <tr
      className="hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => router.push(`/products/${product.id}`)}
    >
      {/* Thumbnail */}
      <td className="px-4 py-3">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 rounded bg-muted" />
        )}
      </td>

      {/* Title */}
      <td className="px-4 py-3 font-medium">{product.title}</td>

      {/* Category */}
      <td className="px-4 py-3 text-muted-foreground">{category}</td>

      {/* Variants count */}
      <td className="px-4 py-3 text-muted-foreground">{product.variants?.length ?? 0}</td>

      {/* Cost — click cell to edit */}
      <td
        className="px-4 py-3"
        onClick={(e) => { e.stopPropagation(); if (!savingCost) setEditingCost(true) }}
      >
        {editingCost ? (
          <input
            autoFocus
            type="number"
            min="0"
            value={costVal}
            onChange={(e) => setCostVal(e.target.value)}
            onBlur={saveCost}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") { setEditingCost(false); setCostVal(rubles(cost)) }
            }}
            className="h-7 w-24 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <span className={`text-sm ${savingCost ? "opacity-40" : "hover:underline underline-offset-2 cursor-text"}`}>
            {cost ? formatRub(cost) : <span className="text-muted-foreground">—</span>}
          </span>
        )}
      </td>

      {/* Status — select dropdown */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <select
          value={product.status}
          disabled={savingStatus}
          onChange={(e) => saveStatus(e.target.value)}
          className="text-xs rounded border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40 cursor-pointer"
        >
          <option value="draft">Черновик</option>
          <option value="published">Опубликован</option>
          <option value="rejected">Отклонён</option>
        </select>
      </td>

      {/* Navigate */}
      <td className="px-4 py-3">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </td>
    </tr>
  )
}

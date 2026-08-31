"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, MoreVertical, Check, Copy, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  listProducts, updateProduct, saveProductCosts, getProduct, createProduct, deleteProduct,
  type AdminProduct,
} from "@/lib/api"
import { formatRub, rubles, toKopecks, cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  published: "Đã đăng",
  draft: "Nháp",
  rejected: "Từ chối",
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
          <h1 className="text-xl font-bold">Sản phẩm</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{count} cái</span>
            <button
              type="button"
              onClick={() => router.push("/products/new")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tạo mới</span>
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Đang tải...</div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Không tìm thấy sản phẩm</div>
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sản phẩm</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Danh mục</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mẫu</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Giá vốn</th>
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

// ── Three-dots menu ───────────────────────────────────────────────────────────

function ProductMenu({ product, onOpenChange }: { product: AdminProduct; onOpenChange?: (open: boolean) => void }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  async function setStatus(status: string) {
    setOpen(false)
    if (product.status === status) return
    setBusy(true)
    try {
      await updateProduct(product.id, { status })
      qc.invalidateQueries({ queryKey: ["products"] })
    } catch {
      toast.error("Lỗi cập nhật trạng thái")
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate() {
    setOpen(false)
    setBusy(true)
    try {
      const { product: full } = await getProduct(product.id)
      const varis = (full.variants ?? []).filter((v) => !v.metadata?.disabled)
      const { product: copy } = await createProduct({
        title: `${full.title} (copy)`,
        status: "draft",
        categories: full.categories?.map((c) => ({ id: c.id })),
        images: full.images?.map((img) => ({ url: img.url })),
        thumbnail: full.thumbnail,
        options: varis.length ? [{ title: "Вариант", values: varis.map((v) => v.title) }] : undefined,
        variants: varis.length
          ? varis.map((v) => ({
              title: v.title,
              sku: v.sku ?? undefined,
              manage_inventory: true,
              prices: [],
              options: { "Вариант": v.title },
            }))
          : undefined,
      })
      const cost = (full.metadata?.cost as number) ?? 0
      if (cost) await saveProductCosts([{ product_id: copy.id, cost }])
      qc.invalidateQueries({ queryKey: ["products"] })
      toast.success("Đã nhân đôi sản phẩm")
    } catch {
      toast.error("Lỗi nhân đôi sản phẩm")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setOpen(false)
    if (!window.confirm(`Xóa "${product.title}"?`)) return
    setBusy(true)
    try {
      await deleteProduct(product.id)
      qc.invalidateQueries({ queryKey: ["products"] })
      toast.success("Đã xóa")
    } catch {
      toast.error("Lỗi xóa sản phẩm")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors disabled:opacity-40"
      >
        {busy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <MoreVertical className="h-3.5 w-3.5" />}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] w-44 rounded-lg border bg-background shadow-lg overflow-hidden text-sm"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="py-1">
            <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Trạng thái</p>
            {(["published", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors"
              >
                {product.status === s
                  ? <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  : <span className="h-3.5 w-3.5 shrink-0" />}
                <span className={product.status === s ? "font-medium" : "text-muted-foreground"}>
                  {STATUS_LABEL[s]}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t py-1">
            <button
              type="button"
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors"
            >
              <Copy className="h-3.5 w-3.5 shrink-0" />
              Nhân đôi
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Xóa
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function ProductRow({ product }: { product: AdminProduct }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const category = product.categories?.[0]?.name ?? "—"
  const cost = (product.metadata?.cost as number) ?? 0

  return (
    <li
      className={cn("flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors cursor-pointer relative", menuOpen && "z-10")}
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
          {category} · {product.variants?.length ?? 0} mẫu · {cost ? formatRub(cost) : "—"}
        </p>
      </div>
      {product.status === "draft" && (
        <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">Nháp</Badge>
      )}
      <ProductMenu product={product} onOpenChange={setMenuOpen} />
    </li>
  )
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function ProductTableRow({ product }: { product: AdminProduct }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const category = product.categories?.[0]?.name ?? "—"
  const cost = (product.metadata?.cost as number) ?? 0

  const [editingCost, setEditingCost] = useState(false)
  const [costVal, setCostVal] = useState(() => rubles(cost))
  const [savingCost, setSavingCost] = useState(false)

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
      toast.error("Không thể cập nhật giá vốn")
      setCostVal(rubles(cost))
    } finally {
      setSavingCost(false)
    }
  }

  return (
    <tr
      className={cn("hover:bg-accent/50 transition-colors cursor-pointer relative", menuOpen && "z-10")}
      onClick={() => router.push(`/products/${product.id}`)}
    >
      <td className="px-4 py-3">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 rounded bg-muted" />
        )}
      </td>
      <td className="px-4 py-3 font-medium">{product.title}</td>
      <td className="px-4 py-3 text-muted-foreground">{category}</td>
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

      {/* Three-dots menu */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <ProductMenu product={product} onOpenChange={setMenuOpen} />
      </td>
    </tr>
  )
}

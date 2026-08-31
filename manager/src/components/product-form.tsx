"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus, Trash2, GripVertical, Upload, Package, Loader2, X, Star } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  AdminProduct, AdminCategory,
  updateProduct, createProduct,
  createVariant, deleteVariant,
  updateVariant,
  uploadFile, listCategories, listStockLocations,
  setInventoryLevel, getVariantStock, getCachedLocationId,
  saveProductCosts,
  type CreateProductInput,
} from "@/lib/api"
import { rubles, toKopecks } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

type ImageItem = { url: string }

type VariantRow = {
  _key: string
  id?: string
  title: string
  sku: string
  stock: string
  initialStock: string
  inventoryItemId?: string
  locationId?: string
  deleted?: boolean
}

type FormState = {
  title: string
  status: "published" | "draft" | "rejected"
  categoryId: string
  cost: string           // cost price in rubles (stored as kopecks in metadata)
  images: ImageItem[]
  variants: VariantRow[]
}

function makeKey() {
  return Math.random().toString(36).slice(2)
}

function flattenCats(
  cats: AdminCategory[],
  depth = 0
): { id: string; name: string; depth: number }[] {
  return cats.flatMap((c) => [
    { id: c.id, name: c.name, depth },
    ...flattenCats(c.category_children ?? [], depth + 1),
  ])
}

function variantToRow(v: AdminProduct["variants"][number]): VariantRow {
  const qty = v.inventory_quantity
  const stock = qty !== undefined && qty !== null ? String(qty) : ""
  // inventory_items[0].inventory_item_id is the actual InventoryItem ID needed for stock-level updates
  const inventoryItemId = v.inventory_items?.[0]?.inventory_item_id
  return {
    _key: v.id,
    id: v.id,
    title: v.title,
    sku: v.sku ?? "",
    stock,
    initialStock: stock,
    inventoryItemId,
  }
}

function initForm(product?: AdminProduct): FormState {
  const cost = (product?.metadata?.cost as number) ?? 0
  return {
    title: product?.title ?? "",
    status: (product?.status ?? "draft") as FormState["status"],
    categoryId: product?.categories?.[0]?.id ?? "",
    cost: rubles(cost),
    images: product?.images?.map((img) => ({ url: img.url })) ?? [],
    variants: product?.variants?.map(variantToRow) ??
      [{ _key: makeKey(), title: "", sku: "", stock: "", initialStock: "" }],
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductForm({
  product,
  isLoading = false,
  isError = false,
}: {
  product?: AdminProduct
  isLoading?: boolean
  isError?: boolean
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const isNew = !product && !isLoading && !isError
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const dragSrcIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const { data: catData } = useQuery({
    queryKey: ["product-categories"],
    queryFn: listCategories,
    staleTime: 60_000,
    retry: 1,
  })
  const { data: locData } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: listStockLocations,
    staleTime: 300_000,
    retry: 1,
  })
  const flatCats = flattenCats(
    (catData?.product_categories ?? []).filter((c) => !c.parent_category_id)
  )
  const defaultLocationId = locData?.stock_locations[0]?.id

  const existingVariantIds = product?.variants.map((v) => v.id) ?? []
  const { data: stockData } = useQuery({
    queryKey: ["variant-stock-form", ...existingVariantIds],
    queryFn: () => getVariantStock(existingVariantIds),
    staleTime: 60_000,
    enabled: existingVariantIds.length > 0,
  })

  const [form, setForm] = useState<FormState>(() => initForm(product))

  // Once stock loads, populate initial stock values AND inventory item IDs (only once)
  const stockInitialized = useRef(false)
  useEffect(() => {
    if (!stockData || stockInitialized.current) return
    stockInitialized.current = true
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => {
        if (!v.id) return v
        const qty = stockData.stock[v.id]
        const invId = stockData.inventory_item_ids?.[v.id]
        const locId = stockData.location_ids?.[v.id]
        const hasLevel = qty !== null && qty !== undefined
        // No level yet (null) but variant is managed → show 0, keep initialStock="" so first save creates the level
        const stockStr = hasLevel ? String(qty) : (invId ? "0" : "")
        return {
          ...v,
          stock: stockStr,
          initialStock: hasLevel ? stockStr : "",
          ...(invId ? { inventoryItemId: invId } : {}),
          ...(locId ? { locationId: locId } : {}),
        }
      }),
    }))
  }, [stockData])

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  // ── Images ───────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const results = await Promise.all(files.map((f) => uploadFile(f)))
      setForm((f) => ({
        ...f,
        images: [...f.images, ...results.map((r) => ({ url: r.url }))],
      }))
    } catch {
      toast.error("Lỗi tải hình ảnh")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  function setThumbnail(idx: number) {
    setForm((f) => {
      const imgs = [...f.images]
      const [picked] = imgs.splice(idx, 1)
      return { ...f, images: [picked, ...imgs] }
    })
  }

  function handleDragStart(idx: number) { dragSrcIdx.current = idx }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  function handleDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    const fromIdx = dragSrcIdx.current
    if (fromIdx === null || fromIdx === toIdx) { setDragOverIdx(null); return }
    setForm((f) => {
      const imgs = [...f.images]
      const [moved] = imgs.splice(fromIdx, 1)
      imgs.splice(toIdx, 0, moved)
      return { ...f, images: imgs }
    })
    dragSrcIdx.current = null
    setDragOverIdx(null)
  }
  function handleDragEnd() { dragSrcIdx.current = null; setDragOverIdx(null) }

  // ── Variants ─────────────────────────────────────────────────
  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        { _key: makeKey(), title: "", sku: "", stock: "", initialStock: "" },
      ],
    }))
  }

  function patchVariant(key: string, field: keyof VariantRow, value: string) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v._key === key ? { ...v, [field]: value } : v)),
    }))
  }

  function markDeleted(key: string) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v._key === key ? { ...v, deleted: true } : v)),
    }))
  }

  // ── Save ─────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim()) { toast.error("Nhập tên sản phẩm"); return }
    setSaving(true)
    try {
      if (product) { await doUpdate() } else { await doCreate() }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu")
    } finally {
      setSaving(false)
    }
  }

  async function doCreate() {
    const activeVariants = form.variants.filter((v) => !v.deleted && v.title.trim())
    const input: CreateProductInput = {
      title: form.title.trim(),
      status: form.status,
      categories: form.categoryId ? [{ id: form.categoryId }] : undefined,
      images: form.images.length ? form.images : undefined,
      thumbnail: form.images[0]?.url ?? null,
      options: activeVariants.length ? [{ title: "Вариант", values: activeVariants.map((v) => v.title.trim()) }] : undefined,
      variants: activeVariants.length
        ? activeVariants.map((v) => ({
            title: v.title.trim(),
            sku: v.sku.trim() || undefined,
            manage_inventory: true,
            prices: [],
            options: { "Вариант": v.title.trim() },
          }))
        : undefined,
    }
    const { product: created } = await createProduct(input)
    if (form.cost) {
      await saveProductCosts([{ product_id: created.id, cost: toKopecks(form.cost) }])
    }
    qc.invalidateQueries({ queryKey: ["products"] })
    toast.success("Đã tạo sản phẩm")
    router.replace(`/products/${created.id}`)
  }

  async function doUpdate() {
    if (!product) return

    await updateProduct(product.id, {
      title: form.title.trim(),
      status: form.status,
      categories: form.categoryId ? [{ id: form.categoryId }] : [],
      images: form.images.map((img) => ({ url: img.url })),
      thumbnail: form.images[0]?.url ?? null,
    })

    if (form.cost) {
      await saveProductCosts([{ product_id: product.id, cost: toKopecks(form.cost) }])
    }

    const toDelete = form.variants.filter((v) => v.deleted && v.id)
    const toUpdate = form.variants.filter((v) => !v.deleted && v.id)
    const toCreate = form.variants.filter((v) => !v.deleted && !v.id && v.title.trim())

    await Promise.all(toDelete.map((v) => deleteVariant(product.id, v.id!)))
    const variantFieldsChanged = toUpdate.filter((v) => {
      const orig = product.variants.find((o) => o.id === v.id)
      return !orig || v.title.trim() !== orig.title || (v.sku.trim() || undefined) !== (orig.sku ?? undefined)
    })
    await Promise.all(
      variantFieldsChanged.map((v) =>
        updateVariant(product.id, v.id!, {
          title: v.title.trim(),
          sku: v.sku.trim() || undefined,
        })
      )
    )
    await Promise.all(
      toCreate.map((v) =>
        createVariant(product.id, {
          title: v.title.trim(),
          sku: v.sku.trim() || undefined,
          manage_inventory: true,
        })
      )
    )

    // stock: only update variants where user typed a new value
    // Use per-variant locationId from pos-stock (actual stocked location), fall back to defaultLocationId
    const stockChanged = toUpdate.filter((v) => v.stock !== "" && v.stock !== v.initialStock && v.inventoryItemId)
    const fallbackLocationId = getCachedLocationId() ?? defaultLocationId
    if (stockChanged.length > 0) {
      try {
        await Promise.all(
          stockChanged
            .filter((v) => v.locationId || fallbackLocationId)
            .map((v) =>
              setInventoryLevel(v.inventoryItemId!, v.locationId ?? fallbackLocationId!, parseInt(v.stock) || 0)
            )
        )
      } catch {
        toast.error("Tồn kho chưa được cập nhật — kiểm tra cài đặt kho")
      }
    }

    qc.invalidateQueries({ queryKey: ["products"] })
    qc.invalidateQueries({ queryKey: ["product", product.id] })
    toast.success("Đã lưu")
    router.back()
  }

  // ── Render ───────────────────────────────────────────────────
  const activeVariants = form.variants.filter((v) => !v.deleted)
  const disabled = saving || isLoading

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold flex-1 truncate">
          {isError ? "Lỗi" : isLoading ? "Đang tải..." : isNew ? "Sản phẩm mới" : form.title || "Chỉnh sửa"}
        </h1>
        {!isError && (
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        )}
      </div>

      {/* Body */}
      {isError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-destructive text-sm">
          <Package className="h-6 w-6 opacity-50" />
          Lỗi tải sản phẩm
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className={`max-w-2xl mx-auto p-4 space-y-6 ${isLoading ? "opacity-40 pointer-events-none" : ""}`}>

            {/* Basic info */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Thông tin cơ bản</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tên</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="Tên sản phẩm"
                    disabled={disabled}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(e) => setField("status", e.target.value as FormState["status"])}
                      disabled={disabled}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="draft">Nháp</option>
                      <option value="published">Đã đăng</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Danh mục</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setField("categoryId", e.target.value)}
                      disabled={disabled}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="">— không có danh mục —</option>
                      {flatCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {"  ".repeat(c.depth)}{c.depth > 0 ? "↳ " : ""}{c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Giá vốn ₽</label>
                    <Input
                      value={form.cost}
                      onChange={(e) => setField("cost", e.target.value)}
                      placeholder="0"
                      type="number"
                      min="0"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Images */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hình ảnh</h2>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Tải lên
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </div>

              {form.images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                >
                  <Package className="h-8 w-8 opacity-40" />
                  <span className="text-sm">Nhấn để tải ảnh lên</span>
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {form.images.map((img, idx) => (
                    <div
                      key={img.url + idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={[
                        "relative group rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing aspect-square transition-all",
                        dragOverIdx === idx ? "border-primary scale-105" : "border-transparent",
                        idx === 0 ? "ring-2 ring-primary ring-offset-1" : "",
                      ].join(" ")}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      {idx === 0 && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded text-[10px] px-1 py-0.5 font-medium leading-none">
                          Ảnh bìa
                        </div>
                      )}
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => setThumbnail(idx)}
                          title="Đặt làm ảnh bìa"
                          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded p-0.5 transition-opacity"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded p-0.5 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3.5 w-3.5 text-white/80" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {form.images.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ảnh đầu tiên là ảnh bìa. Kéo để thay đổi thứ tự.
                </p>
              )}
            </section>

            {/* Variants */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Biến thể ({activeVariants.length})
              </h2>

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                  <span>Tên</span>
                  <span>Mã SP</span>
                  <span>Tồn kho</span>
                  <span />
                </div>

                {activeVariants.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">Không có biến thể</div>
                ) : (
                  <div className="divide-y">
                    {activeVariants.map((v) => (
                      <div
                        key={v._key}
                        className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-3 py-2 items-center"
                      >
                        <input
                          value={v.title}
                          onChange={(e) => patchVariant(v._key, "title", e.target.value)}
                          placeholder="Tên biến thể"
                          disabled={disabled}
                          className="h-8 w-full rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                        <input
                          value={v.sku}
                          onChange={(e) => patchVariant(v._key, "sku", e.target.value)}
                          placeholder="Mã sản phẩm"
                          disabled={disabled}
                          className="h-8 w-full rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                        <input
                          value={v.stock}
                          onChange={(e) => patchVariant(v._key, "stock", e.target.value)}
                          placeholder="—"
                          type="number"
                          min="0"
                          disabled={disabled}
                          className="h-8 w-full rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => markDeleted(v._key)}
                          disabled={disabled}
                          className="h-8 w-8 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t">
                  <button
                    type="button"
                    onClick={addVariant}
                    disabled={disabled}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm biến thể
                  </button>
                </div>
              </div>
            </section>

            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  )
}

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

function getToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)manager_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setToken(token: string) {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  document.cookie = `manager_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Strict`
}

export function clearToken() {
  document.cookie = "manager_token=; path=/; max-age=0"
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const token = options.token ?? getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, err.message ?? res.statusText)
  }

  return res.json() as Promise<T>
}

// ── Auth ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<string> {
  const res = await apiFetch<{ token: string }>("/auth/user/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return res.token
}

// ── Products ────────────────────────────────────────────────────────────────
export type AdminProduct = {
  id: string
  title: string
  thumbnail: string | null
  status: string
  metadata: Record<string, unknown> | null
  categories: { id: string; name: string }[]
  variants: AdminVariant[]
  images: { id: string; url: string }[]
}

export type AdminVariant = {
  id: string
  title: string
  sku: string | null
  prices: { id: string; amount: number; currency_code: string }[]
  inventory_quantity?: number
  manage_inventory?: boolean
  inventory_items?: { id: string; inventory_item_id: string }[]
}

export async function listProducts(params?: {
  q?: string
  limit?: number
  offset?: number
  category_id?: string
}): Promise<{ products: AdminProduct[]; count: number }> {
  const qs = new URLSearchParams()
  if (params?.q) qs.set("q", params.q)
  if (params?.category_id) qs.append("category_id[]", params.category_id)
  qs.set("limit", String(params?.limit ?? 50))
  qs.set("offset", String(params?.offset ?? 0))
  qs.set("fields", "id,title,thumbnail,status,metadata,*variants,*categories")
  return apiFetch(`/admin/products?${qs}`)
}

export async function getProduct(id: string): Promise<{ product: AdminProduct }> {
  return apiFetch(
    `/admin/products/${id}?fields=id,title,thumbnail,status,metadata,*variants,*categories,*images`
  )
}

export async function getVariantInventoryItems(
  variantIds: string[]
): Promise<{ inventory_items: { id: string; variant_id?: string }[] }> {
  const qs = new URLSearchParams()
  variantIds.forEach((id) => qs.append("variant_id[]", id))
  qs.set("fields", "id")
  return apiFetch(`/admin/inventory-items?${qs}`)
}

/** Returns available stock quantity per variant. null = unlimited (manage_inventory=false or no inventory items). */
export async function getVariantStock(
  variantIds: string[]
): Promise<{ stock: Record<string, number | null> }> {
  if (!variantIds.length) return { stock: {} }
  const qs = new URLSearchParams()
  variantIds.forEach((id) => qs.append("variant_id", id))
  return apiFetch(`/admin/pos-stock?${qs}`)
}

export async function updateProduct(
  id: string,
  data: Partial<{
    title: string
    status: string
    metadata: Record<string, unknown>
    categories: { id: string }[]
    images: { url: string }[]
    thumbnail: string | null
  }>
): Promise<{ product: AdminProduct }> {
  return apiFetch(`/admin/products/${id}`, { method: "POST", body: JSON.stringify(data) })
}

export type CreateProductInput = {
  title: string
  status: string
  categories?: { id: string }[]
  images?: { url: string }[]
  thumbnail?: string | null
  variants?: {
    title: string
    sku?: string
    manage_inventory?: boolean
    prices?: { currency_code: string; amount: number }[]
  }[]
}

export async function createProduct(data: CreateProductInput): Promise<{ product: AdminProduct }> {
  return apiFetch("/admin/products", { method: "POST", body: JSON.stringify(data) })
}

export async function updateVariant(
  productId: string,
  variantId: string,
  data: { title?: string; sku?: string; prices?: { id?: string; currency_code: string; amount: number }[] }
): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants/${variantId}`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function createVariant(
  productId: string,
  data: { title: string; sku?: string; manage_inventory?: boolean; prices?: { currency_code: string; amount: number }[] }
): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function deleteVariant(productId: string, variantId: string): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants/${variantId}`, { method: "DELETE" })
}

export async function uploadFile(file: File): Promise<{ url: string; fileId: string }> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const formData = new FormData()
  formData.append("files", file)
  const res = await fetch(`${BACKEND_URL}/admin/uploads`, {
    method: "POST",
    headers,
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, err.message ?? res.statusText)
  }
  const data = await res.json()
  return { url: data.files[0].url, fileId: data.files[0].id }
}

export type StockLocation = { id: string; name: string }

export async function listStockLocations(): Promise<{ stock_locations: StockLocation[] }> {
  return apiFetch("/admin/stock-locations?limit=20")
}

export async function setInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  stockedQuantity: number
): Promise<void> {
  try {
    await apiFetch(`/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`, {
      method: "POST",
      body: JSON.stringify({ stocked_quantity: stockedQuantity }),
    })
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await apiFetch(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
        method: "POST",
        body: JSON.stringify({ location_id: locationId, stocked_quantity: stockedQuantity }),
      })
    } else throw e
  }
}

// ── Product Categories ───────────────────────────────────────────────────────
export type AdminCategory = {
  id: string
  name: string
  handle: string
  is_active: boolean
  is_internal: boolean
  parent_category_id: string | null
  category_children: AdminCategory[]
}

export async function listCategories(): Promise<{ product_categories: AdminCategory[] }> {
  return apiFetch("/admin/product-categories?include_descendants_tree=true&fields=id,name,handle,is_active,is_internal,parent_category_id,*category_children")
}

export async function updateCategory(
  id: string,
  data: { parent_category_id?: string | null; rank?: number }
): Promise<void> {
  await apiFetch(`/admin/product-categories/${id}`, { method: "POST", body: JSON.stringify(data) })
}

// ── POS Orders ───────────────────────────────────────────────────────────────
export type PosOrderItem = {
  variantId?: string
  title: string
  variantTitle?: string
  quantity: number
  unitPrice: number
  thumbnail?: string | null
}

export type PosOrder = {
  id: string
  display_id: number
  status: string
  total: number
  created_at: string
}

export async function createPosOrder(payload: {
  items: PosOrderItem[]
  total: number
  tierId?: string
  mode?: "sell" | "order"
}): Promise<{ order: PosOrder }> {
  return apiFetch("/admin/pos-orders", { method: "POST", body: JSON.stringify(payload) })
}

export async function cancelPosOrder(id: string): Promise<void> {
  await apiFetch(`/admin/pos-orders?id=${encodeURIComponent(id)}`, { method: "DELETE" })
}

// ── POS Order Detail ─────────────────────────────────────────────────────────
export type OrderDetailItem = {
  id: string
  title: string
  variant_id: string | null
  quantity: number
  unit_price: number
  thumbnail: string | null
  metadata: Record<string, unknown>
}

export type OrderDetail = {
  id: string
  display_id: number
  status: string
  created_at: string
  metadata: Record<string, unknown>
  items: OrderDetailItem[]
}

export async function getPosOrder(id: string): Promise<{ order: OrderDetail }> {
  return apiFetch(`/admin/pos-orders/${id}`)
}

type PosOrderPatchItem =
  | { action: "update"; id: string; quantity?: number; unit_price?: number; metadata?: Record<string, unknown> }
  | { action: "add"; title: string; variant_id?: string; quantity?: number; unit_price?: number; metadata?: Record<string, unknown> }

export async function updatePosOrder(
  id: string,
  data: { items?: PosOrderPatchItem[]; metadata?: Record<string, unknown>; complete?: boolean }
): Promise<{ success: boolean }> {
  return apiFetch(`/admin/pos-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) })
}

// ── Orders ───────────────────────────────────────────────────────────────────
export type AdminOrder = {
  id: string
  display_id: number
  status: string
  total: number
  subtotal: number
  created_at: string
  customer: { email: string; first_name?: string; last_name?: string } | null
  items: { id: string; title: string; quantity: number; unit_price: number; total: number }[]
}

export async function listOrders(params?: {
  limit?: number
  offset?: number
  created_at_gte?: string
}): Promise<{ orders: AdminOrder[]; count: number }> {
  const qs = new URLSearchParams()
  qs.set("limit", String(params?.limit ?? 50))
  qs.set("offset", String(params?.offset ?? 0))
  qs.set("fields", "id,display_id,status,total,subtotal,created_at,*customer,*items")
  qs.set("order", "-created_at")
  if (params?.created_at_gte) qs.set("created_at[gte]", params.created_at_gte)
  const raw = await apiFetch<{ orders: AdminOrder[]; count: number }>(`/admin/orders?${qs}`)
  // Medusa stores prices as-is (rubles); multiply by 100 to convert to kopecks for our formatRub() calls
  return {
    count: raw.count,
    orders: raw.orders.map((o) => ({
      ...o,
      total: (o.total ?? 0) * 100,
      subtotal: (o.subtotal ?? 0) * 100,
      items: (o.items ?? []).map((i) => ({
        ...i,
        unit_price: (i.unit_price ?? 0) * 100,
        total: (i.total ?? 0) * 100,
      })),
    })),
  }
}

// ── Pricing config ───────────────────────────────────────────────────────────
export type PricingConfig = {
  tiers: { id: string; label: string; min_order_amount: number; sort_order: number }[]
  default_profit: Record<string, number>
  categories: { id: string; name: string; tier_profit: Record<string, number> }[]
  products: {
    id: string
    title: string
    thumbnail: string | null
    cost: number
    category_id: string | null
    category_name: string | null
    calculated_prices: Record<string, number>
  }[]
}

export async function getPricingConfig(): Promise<PricingConfig> {
  return apiFetch("/admin/pricing-config")
}

export async function saveCategoryMargins(
  updates: { category_id: string; tier_profit: Record<string, number> }[]
): Promise<void> {
  await apiFetch("/admin/pricing-config", { method: "POST", body: JSON.stringify({ updates }) })
}

export async function saveProductCosts(
  updates: { product_id: string; cost: number }[]
): Promise<void> {
  await apiFetch("/admin/pricing-config/products", { method: "POST", body: JSON.stringify({ updates }) })
}

export async function syncPrices(): Promise<{ updated: number; created: number; skipped: number }> {
  return apiFetch("/admin/pricing-config/sync", { method: "POST" })
}

// ── Storefront Media ─────────────────────────────────────────────────────────
export type MediaItem = {
  id: string
  section: "hero" | "reels"
  type: "video" | "image"
  url: string
  title: string | null
  position: number
}

export async function listMediaItems(section?: "hero" | "reels"): Promise<{ items: MediaItem[] }> {
  const qs = section ? `?section=${section}` : ""
  return apiFetch(`/admin/storefront-media${qs}`)
}

export async function createMediaItem(data: {
  section: "hero" | "reels"
  type: "video" | "image"
  url: string
  title?: string | null
  medusa_file_id?: string | null
}): Promise<{ item: MediaItem }> {
  return apiFetch("/admin/storefront-media", { method: "POST", body: JSON.stringify(data) })
}

export async function deleteMediaItem(id: string): Promise<void> {
  await apiFetch(`/admin/storefront-media/${id}`, { method: "DELETE" })
}

export async function reorderMediaItems(
  items: { id: string; position: number }[]
): Promise<void> {
  await apiFetch("/admin/storefront-media/reorder", { method: "POST", body: JSON.stringify({ items }) })
}

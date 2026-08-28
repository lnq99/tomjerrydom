"use server"

import { sdk } from "@lib/config"
import { revalidatePath } from "next/cache"
import { getCartId, getTierId, setTierId } from "./cookies"

export type Tier = {
  id: string
  label: string
  description: string
  /** kopecks */
  min_order_amount: number
  sort_order: number
}

export type TierTotal = {
  id: string
  label: string
  /** kopecks */
  min_order_amount: number
  /** kopecks — item subtotal only */
  subtotal: number
}

export async function listTiers(): Promise<Tier[]> {
  try {
    const res = await sdk.client.fetch<{ tiers: Tier[] }>("/store/tiers", {
      method: "GET",
      cache: "no-store",
    })
    return res.tiers ?? []
  } catch {
    return [
      {
        id: "retail",
        label: "Розница",
        description: "Стандартные цены",
        min_order_amount: 0,
        sort_order: 0,
      },
    ]
  }
}

export async function applyTier(
  cartId: string,
  tierId: string
): Promise<void> {
  try {
    await sdk.client.fetch("/store/tiers/apply", {
      method: "POST",
      body: { cart_id: cartId, tier_id: tierId },
    })
  } catch (e) {
    console.error("applyTier failed:", e)
  }
}

export async function getCartTierTotals(
  cartId: string
): Promise<TierTotal[]> {
  try {
    const res = await sdk.client.fetch<{ tiers: TierTotal[] }>(
      "/store/tiers/cart-totals",
      {
        method: "POST",
        body: { cart_id: cartId },
        cache: "no-store",
      }
    )
    return res.tiers ?? []
  } catch {
    return []
  }
}

/** Server action: set tier cookie, apply to cart, revalidate. */
export async function selectTier(tierId: string): Promise<void> {
  await setTierId(tierId)

  const cartId = await getCartId()
  if (cartId) {
    await applyTier(cartId, tierId)
  }

  revalidatePath("/", "layout")
}

/** Returns the Tier object for the current cookie value, or retail. */
export async function getCurrentTier(tiers: Tier[]): Promise<Tier> {
  const tierId = await getTierId()
  return tiers.find((t) => t.id === tierId) ?? tiers[0]
}

/**
 * Fetch tier-adjusted prices for the given products.
 * Returns a map of variantId → price in kopecks.
 * Returns {} for retail tier or when products have no cost metadata.
 */
export async function getTierProductPrices(
  tierId: string,
  productIds: string[]
): Promise<Record<string, number>> {
  if (tierId === "retail" || productIds.length === 0) return {}
  try {
    const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
    const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
    const params = new URLSearchParams({ tier_id: tierId })
    productIds.forEach((id) => params.append("product_ids[]", id))
    const res = await fetch(`${BASE}/store/tiers/product-prices?${params.toString()}`, {
      headers: { "x-publishable-api-key": PUB_KEY },
      cache: "no-store",
    })
    if (!res.ok) return {}
    const data = await res.json()
    return data.prices ?? {}
  } catch {
    return {}
  }
}

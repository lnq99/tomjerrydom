import type { Slide } from "@lib/use-media-carousel"

export type ReelItem = { id: string; src: string; title?: string | null }

const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

const FALLBACK_SLIDES: Slide[] = []
const FALLBACK_REELS: ReelItem[] = []

export async function getStorefrontMedia(): Promise<{
  heroSlides: Slide[]
  reelItems: ReelItem[]
}> {
  try {
    const res = await fetch(`${BASE}/store/storefront-media`, {
      headers: { "x-publishable-api-key": PUB_KEY },
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const heroSlides: Slide[] = (data.hero ?? []).map(
      (item: { type: string; url: string }) =>
        ({ type: item.type as "video" | "image", src: item.url }) as Slide
    )
    const reelItems: ReelItem[] = (data.reels ?? []).map(
      (item: { id: string; url: string; title?: string | null }) => ({
        id: item.id,
        src: item.url,
        title: item.title ?? null,
      })
    )

    return { heroSlides, reelItems }
  } catch {
    return { heroSlides: FALLBACK_SLIDES, reelItems: FALLBACK_REELS }
  }
}

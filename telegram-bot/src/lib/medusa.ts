import type { Env } from './types'

export interface StoreProduct {
  id: string
  title: string
  variants: StoreVariant[]
  thumbnail: string | null
}

export interface StoreVariant {
  id: string
  title: string
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
}

export function medusaClient(env: Env) {
  async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${env.MEDUSA_BACKEND_URL}${path}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    }
    const res = await fetch(url.toString(), {
      headers: {
        'x-publishable-api-key': env.MEDUSA_API_KEY,
      },
    })
    if (!res.ok) throw new Error(`Medusa GET ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }

  return {
    async listProducts(query?: string): Promise<StoreProduct[]> {
      const params: Record<string, string> = {
        limit: '20',
        fields: 'id,title,thumbnail,variants.id,variants.title,variants.calculated_price',
      }
      if (query) params.q = query
      const data = await get<{ products: StoreProduct[] }>('/store/products', params)
      return data.products
    },

    async getProduct(id: string): Promise<StoreProduct> {
      const data = await get<{ product: StoreProduct }>(
        `/store/products/${id}`,
        { fields: 'id,title,thumbnail,variants.id,variants.title,variants.calculated_price' }
      )
      return data.product
    },
  }
}

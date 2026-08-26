import type { Env, BotCart, BotCartItem } from './types'

const TTL_SECONDS = 60 * 60 * 24 // 24 hours

function key(chatId: number) {
  return `cart:${chatId}`
}

export async function getCart(env: Env, chatId: number): Promise<BotCart> {
  const raw = await env.CART_KV.get(key(chatId))
  if (raw) return JSON.parse(raw) as BotCart
  return { items: [], currencyCode: 'rub' }
}

export async function saveCart(env: Env, chatId: number, cart: BotCart): Promise<void> {
  await env.CART_KV.put(key(chatId), JSON.stringify(cart), {
    expirationTtl: TTL_SECONDS,
  })
}

export async function clearCart(env: Env, chatId: number): Promise<void> {
  await env.CART_KV.delete(key(chatId))
}

export function addItem(cart: BotCart, item: BotCartItem): BotCart {
  const existing = cart.items.find((i) => i.variantId === item.variantId)
  if (existing) {
    return {
      ...cart,
      items: cart.items.map((i) =>
        i.variantId === item.variantId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      ),
    }
  }
  return { ...cart, items: [...cart.items, item] }
}

export function removeItem(cart: BotCart, variantId: string): BotCart {
  return { ...cart, items: cart.items.filter((i) => i.variantId !== variantId) }
}

export function cartTotal(cart: BotCart): number {
  return cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}

export function formatPrice(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

export function renderCart(cart: BotCart): string {
  if (cart.items.length === 0) return 'Корзина пуста.'
  const lines = cart.items.map(
    (i) =>
      `• ${i.productTitle}${i.variantTitle !== 'Default Variant' ? ` (${i.variantTitle})` : ''} × ${i.quantity} = ${formatPrice(i.unitPrice * i.quantity)}`
  )
  lines.push(`\n<b>Итого: ${formatPrice(cartTotal(cart))}</b>`)
  return lines.join('\n')
}

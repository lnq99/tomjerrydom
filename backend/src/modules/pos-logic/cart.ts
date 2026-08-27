import type { PosCart, PosLineItem } from './types'

export function createCart(regionId: string, currencyCode: string): PosCart {
  return { items: [], regionId, currencyCode }
}

export function addItem(cart: PosCart, item: PosLineItem): PosCart {
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

export function removeItem(cart: PosCart, variantId: string): PosCart {
  return { ...cart, items: cart.items.filter((i) => i.variantId !== variantId) }
}

export function updateQuantity(
  cart: PosCart,
  variantId: string,
  quantity: number
): PosCart {
  if (quantity <= 0) return removeItem(cart, variantId)
  return {
    ...cart,
    items: cart.items.map((i) =>
      i.variantId === variantId ? { ...i, quantity } : i
    ),
  }
}

export function updatePrice(cart: PosCart, variantId: string, unitPrice: number): PosCart {
  return {
    ...cart,
    items: cart.items.map((i) =>
      i.variantId === variantId ? { ...i, unitPrice: Math.max(0, unitPrice) } : i
    ),
  }
}

export function cartTotal(cart: PosCart): number {
  return cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}

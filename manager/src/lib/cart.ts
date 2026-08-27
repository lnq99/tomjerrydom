export type LineItem = {
  variantId: string
  variantTitle: string
  productTitle: string
  thumbnail: string | null
  unitPrice: number
  quantity: number
}

export type Cart = { items: LineItem[] }

export const emptyCart: Cart = { items: [] }

export function addItem(cart: Cart, item: LineItem): Cart {
  const existing = cart.items.find((i) => i.variantId === item.variantId)
  if (existing) {
    return {
      items: cart.items.map((i) =>
        i.variantId === item.variantId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      ),
    }
  }
  return { items: [...cart.items, item] }
}

export function removeItem(cart: Cart, variantId: string): Cart {
  return { items: cart.items.filter((i) => i.variantId !== variantId) }
}

export function setQty(cart: Cart, variantId: string, quantity: number): Cart {
  if (quantity <= 0) return removeItem(cart, variantId)
  return {
    items: cart.items.map((i) =>
      i.variantId === variantId ? { ...i, quantity } : i
    ),
  }
}

export function setPrice(cart: Cart, variantId: string, unitPrice: number): Cart {
  return {
    items: cart.items.map((i) =>
      i.variantId === variantId ? { ...i, unitPrice: Math.max(0, unitPrice) } : i
    ),
  }
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}

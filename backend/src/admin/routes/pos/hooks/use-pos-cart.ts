import { useReducer, useCallback } from 'react'
import {
  PosCart,
  PosLineItem,
  createCart,
  addItem,
  removeItem,
  updateQuantity,
  updatePrice,
  cartTotal,
} from '../../../../modules/pos-logic'

type Action =
  | { type: 'ADD_ITEM'; item: PosLineItem }
  | { type: 'REMOVE_ITEM'; variantId: string }
  | { type: 'UPDATE_QTY'; variantId: string; quantity: number }
  | { type: 'UPDATE_PRICE'; variantId: string; unitPrice: number }
  | { type: 'CLEAR' }

function reducer(state: PosCart, action: Action): PosCart {
  switch (action.type) {
    case 'ADD_ITEM':
      return addItem(state, action.item)
    case 'REMOVE_ITEM':
      return removeItem(state, action.variantId)
    case 'UPDATE_QTY':
      return updateQuantity(state, action.variantId, action.quantity)
    case 'UPDATE_PRICE':
      return updatePrice(state, action.variantId, action.unitPrice)
    case 'CLEAR':
      return createCart(state.regionId, state.currencyCode)
  }
}

const INITIAL_CART = createCart('ru', 'rub')

export function usePosCart() {
  const [cart, dispatch] = useReducer(reducer, INITIAL_CART)

  const add = useCallback((item: PosLineItem) => {
    dispatch({ type: 'ADD_ITEM', item })
  }, [])

  const remove = useCallback((variantId: string) => {
    dispatch({ type: 'REMOVE_ITEM', variantId })
  }, [])

  const setQty = useCallback((variantId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', variantId, quantity })
  }, [])

  const setPrice = useCallback((variantId: string, unitPrice: number) => {
    dispatch({ type: 'UPDATE_PRICE', variantId, unitPrice })
  }, [])

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])

  return { cart, total: cartTotal(cart), add, remove, setQty, setPrice, clear }
}

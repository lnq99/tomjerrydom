export type PosLineItem = {
  variantId: string
  quantity: number
  unitPrice: number
}

export type PosCart = {
  items: PosLineItem[]
  customerId?: string
  currencyCode: string
  regionId: string
}

export type PosPaymentMethod = 'cash' | 'yookassa'

export type PosOrderResult = {
  orderId: string
  total: number
  paymentStatus: 'pending' | 'captured' | 'failed'
}

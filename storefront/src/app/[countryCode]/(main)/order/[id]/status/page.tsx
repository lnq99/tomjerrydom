import { Metadata } from "next"
import { notFound } from "next/navigation"
import { formatRub } from "@lib/util/money"

type Props = {
  params: Promise<{ id: string; countryCode: string }>
  searchParams: Promise<{ sig?: string }>
}

export const metadata: Metadata = {
  title: "Статус заказа | Tom&Jerry Дом",
  robots: { index: false, follow: false },
}

// Always fetch fresh — order data changes when manager edits it
export const dynamic = "force-dynamic"

type OrderStatus = "pending" | "completed" | "cancelled" | "archived" | "requires_action"
type PaymentStatus = "awaiting" | "captured" | "not_paid" | "refunded" | "partially_refunded" | string
type FulfillmentStatus = "not_fulfilled" | "fulfilled" | "shipped" | "delivered" | "partially_fulfilled" | "returned" | string

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:          { label: "Ожидает подтверждения", color: "bg-amber-100 text-amber-800 border-amber-200" },
  completed:        { label: "Выполнен",              color: "bg-green-100 text-green-800 border-green-200" },
  cancelled:        { label: "Отменён",               color: "bg-red-100 text-red-800 border-red-200" },
  archived:         { label: "Архивирован",           color: "bg-gray-100 text-gray-600 border-gray-200" },
  requires_action:  { label: "Требует действий",      color: "bg-orange-100 text-orange-800 border-orange-200" },
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  awaiting:           "Ожидает оплаты",
  authorized:         "Ожидает оплаты",
  captured:           "Оплачен",
  not_paid:           "Не оплачен",
  refunded:           "Возвращён",
  partially_refunded: "Частично возвращён",
}

const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  not_fulfilled:       "Не отправлен",
  partially_fulfilled: "Частично отправлен",
  fulfilled:           "Готов к выдаче",
  shipped:             "В пути",
  delivered:           "Доставлен",
  returned:            "Возвращён",
  partially_returned:  "Частично возвращён",
}

type OrderItem = {
  id: string
  title: string
  subtitle?: string | null
  thumbnail?: string | null
  quantity: number
  unit_price: number
}

type ShippingMethod = {
  id: string
  name: string
  amount: number
}

type SafeOrder = {
  id: string
  display_id: number
  status: OrderStatus
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  currency_code: string
  total: number
  subtotal: number
  shipping_total: number
  created_at: string
  updated_at: string
  items: OrderItem[]
  shipping_methods: ShippingMethod[]
}

async function fetchOrderStatus(id: string, sig: string): Promise<SafeOrder | null> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
  try {
    const res = await fetch(
      `${backendUrl}/store/order-status/${id}?sig=${encodeURIComponent(sig)}`,
      {
        cache: "no-store",
        headers: { "x-publishable-api-key": publishableKey },
      }
    )
    if (!res.ok) return null
    const { order } = await res.json()
    return order ?? null
  } catch {
    return null
  }
}

export default async function OrderStatusPage({ params, searchParams }: Props) {
  const { id, countryCode } = await params
  const { sig } = await searchParams

  if (!sig) return notFound()

  const order = await fetchOrderStatus(id, sig)
  if (!order) return notFound()

  const statusInfo = ORDER_STATUS_LABEL[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600 border-gray-200" }
  const paymentLabel = PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status
  const fulfillmentLabel = FULFILLMENT_STATUS_LABEL[order.fulfillment_status] ?? order.fulfillment_status
  const items = order.items ?? []
  const shippingMethods = order.shipping_methods ?? []

  const statusUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? `https://tomjerry.ru/${countryCode}`}/order/${id}/status?sig=${sig}`

  return (
    <div className="py-10 min-h-[calc(100vh-64px)] bg-ui-bg-base">
      <div className="content-container max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <p className="text-xs text-ui-fg-subtle mb-1">Заказ</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">№{order.display_id}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-ui-border-base rounded-xl p-3">
            <p className="text-xs text-ui-fg-subtle mb-1">Оплата</p>
            <p className="text-sm font-medium">{paymentLabel}</p>
          </div>
          <div className="border border-ui-border-base rounded-xl p-3">
            <p className="text-xs text-ui-fg-subtle mb-1">Доставка</p>
            <p className="text-sm font-medium">{fulfillmentLabel}</p>
          </div>
        </div>

        {/* Items */}
        <div className="border border-ui-border-base rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-ui-bg-subtle border-b border-ui-border-base">
            <p className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wide">
              Состав заказа
            </p>
          </div>
          <div className="divide-y divide-ui-border-base">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {item.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-12 h-12 object-cover rounded shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-ui-fg-subtle truncate">{item.subtitle}</p>
                  )}
                  <p className="text-xs text-ui-fg-subtle">
                    {formatRub(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0">
                  {formatRub(item.unit_price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Shipping row — only shown once manager adds it */}
          {shippingMethods.map((sm) => (
            sm.amount > 0 && (
              <div key={sm.id} className="flex justify-between items-center px-4 py-3 border-t border-ui-border-base text-sm text-ui-fg-subtle">
                <span>{sm.name}</span>
                <span>{formatRub(sm.amount)}</span>
              </div>
            )
          ))}

          {/* Total */}
          <div className="px-4 py-3 border-t border-ui-border-base flex justify-between items-center bg-ui-bg-subtle">
            <span className="text-sm text-ui-fg-subtle">Итого</span>
            <span className="text-base font-bold">{formatRub(order.total)}</span>
          </div>
        </div>

        {/* Share this link */}
        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-xl p-4">
          <p className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wide mb-2">
            Ссылка на статус заказа
          </p>
          <p className="text-xs text-ui-fg-subtle break-all mb-3 font-mono">{statusUrl}</p>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(statusUrl)}&text=${encodeURIComponent(`Статус заказа №${order.display_id} — Tom&Jerry Дом`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#229ED9] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a8cc4] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
            </svg>
            Поделиться статусом
          </a>
        </div>

        <p className="text-center text-xs text-ui-fg-subtle">
          Страница обновляется при каждом открытии
        </p>

      </div>
    </div>
  )
}

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { formatRub } from "@lib/util/money"
import { signOrderId } from "@lib/util/order-token"

type Props = {
  order: HttpTypes.StoreOrder
}

function getAnonymousContact(order: HttpTypes.StoreOrder) {
  if (order.shipping_address?.first_name !== "Анонимный") return null
  const addr = order.shipping_address?.address_1 ?? ""
  const idx = addr.indexOf(": ")
  if (idx === -1) return null
  return { method: addr.slice(0, idx), value: addr.slice(idx + 2) }
}

export default async function OrderCompletedTemplate({ order }: Props) {
  const contact = getAnonymousContact(order)
  const isAnonymous = contact !== null
  const items = order.items ?? []
  const total = order.total ?? 0
  const sig = signOrderId(order.id)
  const countryCode = order.shipping_address?.country_code?.toLowerCase() ?? "ru"
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://tomjerry.ru/${countryCode}`
  const statusUrl = `${baseUrl}/order/${order.id}/status?sig=${sig}`
  const orderUrl = `https://tomjerry.ru/ru/order/${order.id}/confirmed`

  return (
    <div className="py-10 min-h-[calc(100vh-64px)]">
      <div className="content-container max-w-2xl mx-auto space-y-6">
        {/* Success header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Заказ оформлен!</h1>
          <p className="text-ui-fg-subtle text-sm">
            Заказ{" "}
            <span className="font-semibold text-ui-fg-base">
              №{order.display_id}
            </span>{" "}
            принят и ожидает подтверждения менеджера.
          </p>
        </div>

        {/* Share card */}
        <div className="bg-ui-bg-subtle rounded-xl p-5 text-center">
          <p className="text-sm font-medium text-ui-fg-base mb-1">
            Отправьте ссылку на статус заказа менеджеру
          </p>
          <p className="text-4xl font-bold text-ui-fg-base mb-4">
            №{order.display_id}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(statusUrl)}&text=${encodeURIComponent(`Статус заказа №${order.display_id} — Tom&Jerry Дом`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#229ED9] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a8cc4] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
              </svg>
              Поделиться статусом
            </a>
            <LocalizedClientLink
              href={`/order/${order.id}/status?sig=${sig}`}
              className="inline-flex items-center justify-center gap-2 border border-ui-border-base bg-white text-ui-fg-base px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-ui-bg-subtle transition-colors"
            >
              Посмотреть статус
            </LocalizedClientLink>
          </div>
        </div>

        {/* Contact info */}
        <div className="border border-ui-border-base rounded-xl p-4">
          <p className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wide mb-3">
            {isAnonymous ? "Контакт для связи" : "Данные получателя"}
          </p>
          {isAnonymous && contact ? (
            <p className="text-sm">
              <span className="text-ui-fg-subtle">{contact.method}:{" "}</span>
              <span className="font-medium">{contact.value}</span>
            </p>
          ) : (
            <div className="text-sm space-y-1">
              {(order.shipping_address?.first_name || order.shipping_address?.last_name) && (
                <p className="font-medium">
                  {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                </p>
              )}
              {order.shipping_address?.phone && (
                <p className="text-ui-fg-subtle">{order.shipping_address.phone}</p>
              )}
              {order.email && (
                <p className="text-ui-fg-subtle">{order.email}</p>
              )}
              {order.shipping_methods?.[0]?.name && (
                <p className="text-ui-fg-subtle">
                  Доставка: {order.shipping_methods[0].name}
                </p>
              )}
              {order.shipping_address?.address_1 &&
                order.shipping_address.address_1 !== "Самовывоз" && (
                  <p className="text-ui-fg-subtle">
                    {order.shipping_address.city && `${order.shipping_address.city}, `}
                    {order.shipping_address.address_1}
                    {order.shipping_address.postal_code &&
                      `, ${order.shipping_address.postal_code}`}
                  </p>
                )}
            </div>
          )}
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
                    alt={item.title ?? ""}
                    className="w-12 h-12 object-cover rounded shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
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
          <div className="px-4 py-3 border-t border-ui-border-base flex justify-between items-center bg-ui-bg-subtle">
            <span className="text-sm text-ui-fg-subtle">Итого</span>
            <span className="text-base font-bold">{formatRub(total)}</span>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Менеджер уточнит наличие товаров, итоговую стоимость и детали доставки.
          Оплата — наличными или переводом после подтверждения заказа.
        </div>

        <LocalizedClientLink
          href="/"
          className="block text-center text-sm text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          Вернуться в магазин
        </LocalizedClientLink>
      </div>
    </div>
  )
}

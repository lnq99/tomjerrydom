"use client"

import { useState, useActionState } from "react"
import { placeAnonymousOrder, placeTraditionalOrder } from "@lib/data/cart"

const CONTACT_METHODS = [
  { id: "telegram", label: "Telegram", placeholder: "@username или ссылка" },
  { id: "phone", label: "Телефон", placeholder: "+7 000 000-00-00" },
  { id: "vk", label: "ВКонтакте", placeholder: "@username или ссылка" },
  { id: "max", label: "Max", placeholder: "@username или ссылка" },
  { id: "facebook", label: "Facebook", placeholder: "ссылка на профиль" },
]

export default function CheckoutForm() {
  const [mode, setMode] = useState<"anonymous" | "traditional">("traditional")
  const [deliveryType, setDeliveryType] = useState<"pickup" | "courier">("pickup")
  const [contactMethod, setContactMethod] = useState("telegram")

  const [anonError, anonAction, anonPending] = useActionState(placeAnonymousOrder, null)
  const [tradError, tradAction, tradPending] = useActionState(placeTraditionalOrder, null)

  const pending = anonPending || tradPending
  const error = anonError || tradError

  return (
    <div className="w-full space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("traditional")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mode === "traditional"
              ? "bg-ui-fg-base text-white"
              : "bg-white text-ui-fg-base hover:bg-ui-bg-subtle"
          }`}
        >
          Доставка / Самовывоз
        </button>
        <button
          type="button"
          onClick={() => setMode("anonymous")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mode === "anonymous"
              ? "bg-ui-fg-base text-white"
              : "bg-white text-ui-fg-base hover:bg-ui-bg-subtle"
          }`}
        >
          Связаться с менеджером
        </button>
      </div>

      {mode === "anonymous" ? (
        <form action={anonAction} className="space-y-4">
          <p className="text-sm text-ui-fg-subtle">
            Оставьте контакт — менеджер свяжется с вами для уточнения деталей доставки и оплаты.
          </p>

          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-1.5">
              Способ связи
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setContactMethod(m.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    contactMethod === m.id
                      ? "border-ui-fg-base bg-ui-fg-base text-white"
                      : "border-ui-border-base bg-white text-ui-fg-base hover:border-ui-fg-base"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="contact_method" value={contactMethod} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-1.5">
              {CONTACT_METHODS.find((m) => m.id === contactMethod)?.label}
            </label>
            <input
              name="contact_value"
              type={contactMethod === "phone" ? "tel" : "text"}
              placeholder={CONTACT_METHODS.find((m) => m.id === contactMethod)?.placeholder}
              required
              className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-1.5">
              Комментарий к заказу <span className="text-ui-fg-subtle font-normal">(необязательно)</span>
            </label>
            <textarea
              name="note"
              rows={2}
              placeholder="Пожелания, уточнения..."
              className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ui-fg-base text-white py-3 rounded-md text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {pending ? "Оформляем заказ..." : "Отправить заказ"}
          </button>
        </form>
      ) : (
        <form action={tradAction} className="space-y-4">
          {/* Delivery type */}
          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-2">
              Способ получения
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "pickup", label: "Самовывоз", sub: "ТЯК Москва" },
                { id: "courier", label: "Доставка курьером", sub: "Стоимость уточняется" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDeliveryType(opt.id as "pickup" | "courier")}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    deliveryType === opt.id
                      ? "border-ui-fg-base bg-ui-bg-subtle"
                      : "border-ui-border-base hover:border-ui-fg-base"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-ui-fg-subtle mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
            <input type="hidden" name="delivery_type" value={deliveryType} />
          </div>

          {/* Contact fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ui-fg-base mb-1.5">Имя *</label>
              <input
                name="first_name"
                type="text"
                required
                autoComplete="given-name"
                className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ui-fg-base mb-1.5">Фамилия</label>
              <input
                name="last_name"
                type="text"
                autoComplete="family-name"
                className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-1.5">Email *</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-1.5">Телефон *</label>
            <input
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+7 000 000-00-00"
              className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
            />
          </div>

          {/* Courier address fields */}
          {deliveryType === "courier" && (
            <div className="space-y-3 pt-1">
              <p className="text-sm font-medium text-ui-fg-base">Адрес доставки</p>
              <div>
                <label className="block text-sm text-ui-fg-subtle mb-1.5">Город *</label>
                <input
                  name="city"
                  type="text"
                  required={deliveryType === "courier"}
                  autoComplete="address-level2"
                  className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
                />
              </div>
              <div>
                <label className="block text-sm text-ui-fg-subtle mb-1.5">Улица, дом, квартира *</label>
                <input
                  name="address_1"
                  type="text"
                  required={deliveryType === "courier"}
                  autoComplete="street-address"
                  className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
                />
              </div>
              <div>
                <label className="block text-sm text-ui-fg-subtle mb-1.5">Индекс</label>
                <input
                  name="postal_code"
                  type="text"
                  autoComplete="postal-code"
                  className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ui-fg-base mb-1.5">
              Комментарий <span className="text-ui-fg-subtle font-normal">(необязательно)</span>
            </label>
            <textarea
              name="note"
              rows={2}
              placeholder="Пожелания, уточнения..."
              className="w-full border border-ui-border-base rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ui-fg-base resize-none"
            />
          </div>

          <p className="text-xs text-ui-fg-subtle">
            Оплата — наличными или переводом. Менеджер подтвердит заказ и сообщит итоговую сумму.
          </p>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ui-fg-base text-white py-3 rounded-md text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {pending ? "Оформляем заказ..." : "Оформить заказ"}
          </button>
        </form>
      )}
    </div>
  )
}

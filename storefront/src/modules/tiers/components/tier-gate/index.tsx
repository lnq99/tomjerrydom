"use client"

import { selectTier, type Tier, type TierTotal } from "@lib/data/tiers"
import { clx } from "@modules/common/components/ui"
import { ReactNode } from "react"

function formatRub(kopecks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}

type Props = {
  /** kopecks */
  cartItemSubtotal: number
  tiers: Tier[]
  tierTotals: TierTotal[]
  currentTierId: string
  /** The PaymentButton — rendered only when gate is open */
  children: ReactNode
}

export default function TierGate({
  cartItemSubtotal,
  tiers,
  tierTotals,
  currentTierId,
  children,
}: Props) {
  const currentTier = tiers.find((t) => t.id === currentTierId) ?? tiers[0]

  // Gate is open if the cart meets the tier minimum
  const meetsMinimum = cartItemSubtotal >= currentTier.min_order_amount

  // Qualifying tiers = those whose minimum the cart already meets
  const qualifyingTiers = tierTotals.filter(
    (tt) => {
      const tier = tiers.find((t) => t.id === tt.id)
      return tier && cartItemSubtotal >= tier.min_order_amount && tt.id !== currentTierId
    }
  )

  // Better tier = higher minimum that the cart meets (upgrade prompt)
  const betterTiers = qualifyingTiers.filter((tt) => {
    const tier = tiers.find((t) => t.id === tt.id)
    return tier && tier.min_order_amount > currentTier.min_order_amount
  })

  if (meetsMinimum) {
    return (
      <>
        {/* Non-blocking upgrade prompt */}
        {betterTiers.length > 0 && (
          <div className="mb-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <p className="txt-small text-ui-fg-subtle mb-2">
              Ваш заказ подходит для лучших условий:
            </p>
            <div className="flex flex-wrap gap-2">
              {betterTiers.map((tt) => {
                const tier = tiers.find((t) => t.id === tt.id)!
                return (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => selectTier(tt.id)}
                    className={clx(
                      "rounded border border-ui-border-interactive px-3 py-1.5",
                      "txt-compact-small text-ui-fg-interactive hover:bg-ui-bg-interactive/5 transition-colors"
                    )}
                  >
                    {tier.label}{" "}
                    <span className="font-medium">[{formatRub(tt.subtotal)}]</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {children}
      </>
    )
  }

  // Gate is CLOSED — show switch options, hide PaymentButton
  const switchOptions = tierTotals.filter((tt) => {
    const tier = tiers.find((t) => t.id === tt.id)
    return tier && tt.id !== currentTierId && cartItemSubtotal >= tier.min_order_amount
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-ui-border-error bg-ui-bg-subtle p-4">
        <p className="txt-compact-small-plus text-ui-fg-base mb-1">
          Минимальная сумма не достигнута
        </p>
        <p className="txt-small text-ui-fg-subtle">
          Для тарифа «{currentTier.label}» требуется минимум{" "}
          <span className="font-medium">{formatRub(currentTier.min_order_amount)}</span>.
          Ваша сумма товаров:{" "}
          <span className="font-medium">{formatRub(cartItemSubtotal)}</span>.
        </p>
      </div>

      {switchOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="txt-xsmall text-ui-fg-muted">Переключить на доступный тариф:</span>
          <div className="flex flex-wrap gap-2">
            {switchOptions.map((tt) => {
              const tier = tiers.find((t) => t.id === tt.id)!
              return (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => selectTier(tt.id)}
                  className={clx(
                    "rounded border border-ui-border-base bg-ui-bg-base px-3 py-2",
                    "txt-compact-small text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors"
                  )}
                >
                  {tier.label}{" "}
                  <span className="text-ui-fg-muted">[{formatRub(tt.subtotal)}]</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Always offer retail as fallback */}
      {!switchOptions.some((tt) => tt.id === "retail") && (
        <button
          type="button"
          onClick={() => selectTier("retail")}
          className={clx(
            "rounded border border-ui-border-base bg-ui-bg-base px-3 py-2",
            "txt-compact-small text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors self-start"
          )}
        >
          Розница{" "}
          <span className="text-ui-fg-muted">
            [{formatRub(tierTotals.find((t) => t.id === "retail")?.subtotal ?? cartItemSubtotal)}]
          </span>
        </button>
      )}
    </div>
  )
}

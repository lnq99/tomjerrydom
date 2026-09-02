"use client"

import { useState, useTransition } from "react"
import { Button } from "@modules/common/components/ui"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import TierSwitcher from "@modules/tiers/components/tier-switcher"
import { HttpTypes } from "@medusajs/types"
import { selectTier, type Tier, type TierTotal } from "@lib/data/tiers"

function formatRub(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount)
}

type SummaryProps = {
  cart: HttpTypes.StoreCart
  tiers?: Tier[]
  tierTotals?: TierTotal[]
  currentTierId?: string
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({
  cart,
  tiers = [],
  tierTotals = [],
  currentTierId = "retail",
}: SummaryProps) => {
  const [infoOpen, setInfoOpen] = useState(false)
  const [, startTransition] = useTransition()
  const step = getCheckoutStep(cart)

  const currentTier = tiers.find((t) => t.id === currentTierId) ?? tiers[0]
  const cartItemSubtotal = cart.item_subtotal ?? 0
  const meetsMinimum =
    !currentTier ||
    currentTier.min_order_amount === 0 ||
    cartItemSubtotal >= currentTier.min_order_amount

  // Higher tiers the cart does NOT yet qualify for (near-miss candidates)
  const nearMissTiers =
    meetsMinimum && tiers.length > 1
      ? tiers
          .filter((t) => t.min_order_amount > (currentTier?.min_order_amount ?? 0))
          .filter((t) => {
            const tt = tierTotals.find((x) => x.id === t.id)
            return tt && tt.subtotal < t.min_order_amount
          })
          .sort((a, b) => a.sort_order - b.sort_order)
      : []

  // Lower tiers the cart qualifies for (shown when force-blocked)
  const fallbackTiers = !meetsMinimum
    ? tiers.filter((t) => {
        const tt = tierTotals.find((x) => x.id === t.id)
        return tt && tt.id !== currentTierId && tt.subtotal >= t.min_order_amount
      })
    : []

  const retailTotal = tierTotals.find((t) => t.id === "retail")

  // Progress bar toward next tier (nearest unachieved tier above current)
  const nextTier = tiers
    .filter((t) => t.min_order_amount > (currentTier?.min_order_amount ?? 0))
    .sort((a, b) => a.sort_order - b.sort_order)[0]
  const progressPct = nextTier
    ? Math.min(Math.round((cartItemSubtotal / nextTier.min_order_amount) * 100), 100)
    : 100
  const amountToNext = nextTier ? Math.max(nextTier.min_order_amount - cartItemSubtotal, 0) : 0

  return (
    <div className="flex flex-col gap-y-4">
      {/* Tier progress bar — shown when there's a next tier to unlock */}
      {tiers.length > 1 && nextTier && (
        <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between txt-compact-small">
            <span className="text-ui-fg-subtle font-medium">
              {currentTier?.label ?? "Розница"}
            </span>
            <span className="text-ui-fg-muted text-xs">
              {amountToNext > 0
                ? `Ещё ${formatRub(amountToNext)} до «${nextTier.label}»`
                : `Уровень «${nextTier.label}» разблокирован!`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-ui-bg-base overflow-hidden">
            <div
              className="h-full rounded-full bg-ui-fg-interactive transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-ui-fg-muted">
            <span>{formatRub(cartItemSubtotal)}</span>
            <span>{formatRub(nextTier.min_order_amount)}</span>
          </div>
        </div>
      )}

      {/* Qualifying upgrade banners (green) */}
      {meetsMinimum && tiers.length > 1 && (
        <TierSwitcher
          tiers={tiers}
          tierTotals={tierTotals}
          currentTierId={currentTierId}
        />
      )}

      <DiscountCode cart={cart} />
      <Divider />

      <CartTotals
        totals={cart}
        tierLabel={tiers.length > 1 ? currentTier?.label : undefined}
        onTierInfoClick={nearMissTiers.length > 0 ? () => setInfoOpen((o) => !o) : undefined}
      />

      {/* Near-miss tier info (expandable via ⓘ) */}
      {infoOpen && nearMissTiers.length > 0 && (
        <div className="flex flex-col gap-2 -mt-2">
          {nearMissTiers.map((tier) => {
            const tt = tierTotals.find((x) => x.id === tier.id)!
            const amountNeeded = tier.min_order_amount - tt.subtotal
            return (
              <div
                key={tier.id}
                className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 flex flex-col gap-2"
              >
                <p className="txt-small text-ui-fg-subtle">
                  При переходе на «{tier.label}» корзина составит{" "}
                  <span className="font-medium">{formatRub(tt.subtotal)}</span>
                </p>
                <p className="txt-small text-ui-fg-muted">
                  Нужно добавить ещё{" "}
                  <span className="font-medium">~{formatRub(amountNeeded)}</span>{" "}
                  для перехода
                </p>
                <button
                  type="button"
                  onClick={() => startTransition(() => selectTier(tier.id))}
                  className="w-full rounded border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover txt-compact-small text-ui-fg-base py-2 transition-colors"
                >
                  Перейти на «{tier.label}» ({formatRub(tt.subtotal)})
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Force-switch block: cart below current tier minimum */}
      {!meetsMinimum && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-ui-tag-red-border bg-ui-tag-red-bg p-3">
            <p className="txt-compact-small-plus text-ui-tag-red-text mb-1">
              Минимальная сумма не достигнута
            </p>
            <p className="txt-small text-ui-tag-red-text/80">
              Для тарифа «{currentTier?.label}» требуется минимум{" "}
              <span className="font-medium">
                {formatRub(currentTier?.min_order_amount ?? 0)}
              </span>
              . Ваша сумма:{" "}
              <span className="font-medium">{formatRub(cartItemSubtotal)}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="txt-xsmall text-ui-fg-muted">
              Перейти на доступный тариф:
            </span>
            <div className="flex flex-wrap gap-2">
              {fallbackTiers.map((tier) => {
                const tt = tierTotals.find((x) => x.id === tier.id)!
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => startTransition(() => selectTier(tier.id))}
                    className="rounded border border-ui-border-base bg-ui-bg-base px-3 py-1.5 txt-compact-small text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors"
                  >
                    {tier.label}{" "}
                    <span className="text-ui-fg-muted">
                      ({formatRub(tt.subtotal)})
                    </span>
                  </button>
                )
              })}
              {/* Always offer retail as fallback */}
              {!fallbackTiers.some((t) => t.id === "retail") && retailTotal && (
                <button
                  type="button"
                  onClick={() => startTransition(() => selectTier("retail"))}
                  className="rounded border border-ui-border-base bg-ui-bg-base px-3 py-1.5 txt-compact-small text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors"
                >
                  Розница{" "}
                  <span className="text-ui-fg-muted">
                    ({formatRub(retailTotal.subtotal)})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="w-full h-10" disabled={!meetsMinimum}>
          {meetsMinimum ? "Оформить заказ" : "Выберите доступный тариф"}
        </Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary

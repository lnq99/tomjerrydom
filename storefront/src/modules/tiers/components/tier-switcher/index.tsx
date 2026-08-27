"use client"

import { selectTier, type Tier, type TierTotal } from "@lib/data/tiers"
import { useTransition } from "react"

function formatRub(kopecks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}

type Props = {
  tiers: Tier[]
  tierTotals: TierTotal[]
  currentTierId: string
}

export default function TierSwitcher({ tiers, tierTotals, currentTierId }: Props) {
  const [, startTransition] = useTransition()
  if (tiers.length <= 1) return null

  const currentTier = tiers.find((t) => t.id === currentTierId) ?? tiers[0]

  // Tiers with higher minimum than current (potential upgrades), sorted ascending
  const higherTiers = tiers
    .filter((t) => t.min_order_amount > currentTier.min_order_amount)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Tiers whose prices the cart already qualifies for
  const qualifyingUpgrades = higherTiers.filter((tier) => {
    const tt = tierTotals.find((x) => x.id === tier.id)
    return tt && tt.subtotal >= tier.min_order_amount
  })

  if (qualifyingUpgrades.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {qualifyingUpgrades.map((tier) => {
        const tt = tierTotals.find((x) => x.id === tier.id)!
        return (
          <div
            key={tier.id}
            className="rounded-lg border border-ui-tag-green-border bg-ui-tag-green-bg p-3 flex flex-col gap-2"
          >
            <p className="txt-small text-ui-tag-green-text">
              Ваша корзина подходит для тарифа «{tier.label}»
            </p>
            <button
              type="button"
              onClick={() => startTransition(() => selectTier(tier.id))}
              className="w-full rounded border border-ui-tag-green-border bg-ui-tag-green-bg hover:bg-ui-tag-green-text/10 txt-compact-small-plus text-ui-tag-green-text py-2 transition-colors"
            >
              Перейти на «{tier.label}» ({formatRub(tt.subtotal)})
            </button>
          </div>
        )
      })}
    </div>
  )
}

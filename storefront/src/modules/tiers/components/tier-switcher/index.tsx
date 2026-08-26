"use client"

import { selectTier, type Tier, type TierTotal } from "@lib/data/tiers"
import { clx } from "@modules/common/components/ui"

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
  if (tiers.length <= 1) return null

  const currentTier = tiers.find((t) => t.id === currentTierId) ?? tiers[0]
  const currentTotal = tierTotals.find((t) => t.id === currentTierId)
  const alternatives = tierTotals.filter((t) => t.id !== currentTierId)

  if (alternatives.length === 0) return null

  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          Текущий тип цен
        </span>
        <span className="txt-compact-small-plus text-ui-fg-base">
          {currentTier.label}
        </span>
      </div>

      {alternatives.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="txt-xsmall text-ui-fg-muted">Переключить на:</span>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((alt) => {
              const tier = tiers.find((t) => t.id === alt.id)
              if (!tier) return null
              return (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => selectTier(alt.id)}
                  className={clx(
                    "rounded border border-ui-border-base bg-ui-bg-base px-3 py-1.5",
                    "txt-compact-small text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors"
                  )}
                >
                  {tier.label}{" "}
                  <span className="text-ui-fg-muted">
                    [{formatRub(alt.subtotal)}]
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {currentTotal && currentTier.min_order_amount > 0 && (
        <p className="txt-xsmall text-ui-fg-muted">
          Минимум для {currentTier.label}:{" "}
          {formatRub(currentTier.min_order_amount)}
        </p>
      )}
    </div>
  )
}

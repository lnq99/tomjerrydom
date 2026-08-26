"use client"

import { selectTier, type Tier } from "@lib/data/tiers"
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
  currentTierId: string
}

export default function TierPicker({ tiers, currentTierId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="txt-compact-xlarge-plus text-ui-fg-base">
          Выберите тип цен
        </h2>
        <p className="txt-medium text-ui-fg-subtle mt-1">
          Оптовые цены применяются при соблюдении минимальной суммы заказа
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xsmall:grid-cols-2 small:grid-cols-3">
        {tiers.map((tier) => {
          const isActive = tier.id === currentTierId
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => selectTier(tier.id)}
              className={clx(
                "flex flex-col gap-2 rounded-lg border p-4 text-left transition-all",
                "hover:border-ui-border-interactive focus-visible:outline-none focus-visible:ring-2",
                isActive
                  ? "border-ui-border-interactive bg-ui-bg-interactive/5"
                  : "border-ui-border-base bg-ui-bg-base"
              )}
            >
              <span className="txt-compact-medium-plus text-ui-fg-base">
                {tier.label}
              </span>
              {tier.description && (
                <span className="txt-small text-ui-fg-subtle">
                  {tier.description}
                </span>
              )}
              <span className="txt-small text-ui-fg-muted">
                {tier.min_order_amount === 0
                  ? "Без минимального заказа"
                  : `Минимум ${formatRub(tier.min_order_amount)}`}
              </span>
              {isActive && (
                <span className="txt-xsmall-plus text-ui-fg-interactive">
                  ✓ Выбрано
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

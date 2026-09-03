"use client"

import { selectTier, type Tier } from "@lib/data/tiers"
import { useTier } from "@lib/context/tier-context"
import { useEffect, useState, useTransition } from "react"

const TIER_COLORS = [
  {
    text: "text-ui-fg-base",
    border: "border-ui-border-base hover:border-ui-border-strong",
    dot: "bg-ui-fg-muted",
    hover: "hover:bg-ui-bg-subtle",
  },
  {
    text: "text-amber-600",
    border: "border-amber-200 hover:border-amber-400",
    dot: "bg-amber-400",
    hover: "hover:bg-amber-50",
  },
  {
    text: "text-blue-600",
    border: "border-blue-200 hover:border-blue-400",
    dot: "bg-blue-400",
    hover: "hover:bg-blue-50",
  },
  {
    text: "text-emerald-600",
    border: "border-emerald-200 hover:border-emerald-400",
    dot: "bg-emerald-400",
    hover: "hover:bg-emerald-50",
  },
]

function getTierColor(idx: number) {
  return TIER_COLORS[Math.min(idx, TIER_COLORS.length - 1)]
}

function formatRub(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount)
}

const STORAGE_KEY = "_tier_picked"

export default function TierPickerModal({ tiers }: { tiers: Tier[] }) {
  const { setActiveTierId } = useTier()
  const [visible, setVisible] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  if (!visible || tiers.length <= 1) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  const pick = (tierId: string) => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
    setActiveTierId(tierId)
    startTransition(() => selectTier(tierId))
  }

  const rangeLabel = (tier: Tier, idx: number) => {
    const next = tiers[idx + 1]
    if (tier.min_order_amount === 0 && next) return `до ${formatRub(next.min_order_amount)}`
    if (!next) return `от ${formatRub(tier.min_order_amount)}`
    return `${formatRub(tier.min_order_amount)} – ${formatRub(next.min_order_amount)}`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl pointer-events-auto relative">
          {/* Close */}
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-subtle transition-colors"
            aria-label="Закрыть"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>

          {/* Header */}
          <div className="px-6 pt-8 pb-5 text-center">
            <p className="text-[10px] font-bold tracking-widest uppercase text-ui-fg-muted mb-2">
              Tom&amp;Jerry Дом
            </p>
            <h2 className="text-2xl font-black text-ui-fg-base mb-1">
              Выберите тип цен
            </h2>
            <p className="text-sm text-ui-fg-muted">
              Цены сразу отображаются в каталоге
            </p>
          </div>

          {/* Tier list */}
          <div className="px-4 pb-6 flex flex-col gap-2">
            {tiers.map((tier, idx) => {
              const c = getTierColor(idx)
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => pick(tier.id)}
                  className={`w-full rounded-xl border-2 ${c.border} ${c.hover} px-4 py-4 text-left transition-all duration-150 active:scale-[0.98]`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className={`text-base font-bold ${c.text}`}>
                        {tier.label}
                      </span>
                    </div>
                    <span className="text-xs text-ui-fg-muted tabular-nums shrink-0">
                      {rangeLabel(tier, idx)}
                    </span>
                  </div>
                  {tier.description && (
                    <p className="text-xs text-ui-fg-muted mt-1.5 ml-5">
                      {tier.description}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

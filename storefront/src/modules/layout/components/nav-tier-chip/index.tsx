"use client"

import { selectTier, type Tier } from "@lib/data/tiers"
import { useTier } from "@lib/context/tier-context"
import { useEffect, useRef, useState, useTransition } from "react"

const TIER_COLORS = [
  { text: "text-ui-fg-subtle", border: "border-ui-border-base", bg: "bg-ui-bg-subtle", dot: "bg-ui-fg-muted", activeBg: "bg-ui-bg-subtle" },
  { text: "text-amber-600", border: "border-amber-300", bg: "bg-amber-50", dot: "bg-amber-400", activeBg: "bg-amber-50" },
  { text: "text-blue-600", border: "border-blue-300", bg: "bg-blue-50", dot: "bg-blue-400", activeBg: "bg-blue-50" },
  { text: "text-emerald-600", border: "border-emerald-300", bg: "bg-emerald-50", dot: "bg-emerald-400", activeBg: "bg-emerald-50" },
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

function rangeLabel(tiers: Tier[], idx: number) {
  const tier = tiers[idx]
  const next = tiers[idx + 1]
  if (tier.min_order_amount === 0 && next) return `до ${formatRub(next.min_order_amount)}`
  if (!next) return `от ${formatRub(tier.min_order_amount)}`
  return `${formatRub(tier.min_order_amount)} – ${formatRub(next.min_order_amount)}`
}

type Props = {
  tiers: Tier[]
}

export default function NavTierChip({ tiers }: Props) {
  const { activeTierId, setActiveTierId } = useTier()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const currentIdx = tiers.findIndex((t) => t.id === activeTierId)
  const current = tiers[currentIdx >= 0 ? currentIdx : 0]
  const color = getTierColor(currentIdx >= 0 ? currentIdx : 0)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  if (!current || tiers.length <= 1) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${color.border} ${color.bg} ${color.text}`}
        aria-label={`Текущий тип цен: ${current.label}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
        <span className="hidden small:inline">{current.label}</span>
        <svg
          viewBox="0 0 12 8"
          className={`w-2.5 h-2.5 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-64 rounded-xl border border-ui-border-base bg-white shadow-lg z-50 overflow-hidden">
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ui-fg-muted">
            Тип цен
          </p>
          {tiers.map((tier, idx) => {
            const c = getTierColor(idx)
            const isActive = tier.id === activeTierId
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  setActiveTierId(tier.id)
                  startTransition(() => selectTier(tier.id))
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-ui-bg-subtle ${isActive ? c.activeBg : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className={`text-sm font-medium ${isActive ? c.text : "text-ui-fg-base"}`}>
                    {tier.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-ui-fg-muted">✓</span>
                  )}
                </div>
                <span className="text-[10px] text-ui-fg-muted tabular-nums">
                  {rangeLabel(tiers, idx)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

"use client"

import { selectTier, type Tier } from "@lib/data/tiers"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

function formatK(kopecks: number): string {
  const rubles = kopecks / 100
  if (rubles >= 1000) {
    const k = rubles / 1000
    const rounded = Math.round(k * 10) / 10
    return `${rounded} тыс.₽`
  }
  return `${Math.round(rubles)} ₽`
}

function formatShortTier(tier: Tier): string {
  if (tier.min_order_amount === 0) return tier.label
  const k = Math.round(tier.min_order_amount / 100 / 1000)
  const amount = k > 0 ? `${k}к` : `${Math.round(tier.min_order_amount / 100)}₽`
  const firstWord = tier.label.split(/\s+/)[0]
  return `${firstWord} ${amount}`
}

function tierRange(tiers: Tier[], tier: Tier): string {
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order)
  const idx = sorted.findIndex((t) => t.id === tier.id)
  const next = sorted[idx + 1]

  if (tier.min_order_amount === 0) {
    return next ? `до ${formatK(next.min_order_amount)}` : ""
  }
  return next
    ? `${formatK(tier.min_order_amount)}–${formatK(next.min_order_amount)}`
    : `от ${formatK(tier.min_order_amount)}`
}

type Props = {
  tiers: Tier[]
  currentTierId: string
}

export default function NavTierDropdown({ tiers, currentTierId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const currentTier = tiers.find((t) => t.id === currentTierId) ?? tiers[0]
  const range = tierRange(tiers, currentTier)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (id: string) => {
    setOpen(false)
    startTransition(async () => {
      await selectTier(id)
      router.refresh()
    })
  }

  if (tiers.length <= 1) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-1.5 h-8 px-3 rounded-rounded border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-base whitespace-nowrap transition-colors disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="txt-compact-small-plus">{formatShortTier(currentTier)}</span>
        {range && (
          <span className="txt-xsmall text-ui-fg-muted hidden medium:inline">
            {range}
          </span>
        )}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3.5 h-3.5 text-ui-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full mt-1 left-0 z-50 min-w-[180px] rounded-rounded border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden"
        >
          {tiers.map((tier) => {
            const r = tierRange(tiers, tier)
            const isActive = tier.id === currentTierId
            return (
              <li key={tier.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSelect(tier.id)}
                  className={`w-full flex flex-col items-start px-3 py-2.5 text-left hover:bg-ui-bg-base-hover transition-colors ${
                    isActive ? "bg-ui-bg-interactive/5" : ""
                  }`}
                >
                  <span className="txt-compact-small-plus text-ui-fg-base">
                    {tier.label}
                    {isActive && (
                      <span className="ml-1.5 txt-xsmall text-ui-fg-interactive">
                        ✓
                      </span>
                    )}
                  </span>
                  {r && (
                    <span className="txt-xsmall text-ui-fg-muted">{r}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

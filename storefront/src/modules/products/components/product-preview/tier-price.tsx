"use client"

import { useTier } from "@lib/context/tier-context"

function formatRub(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function TierPriceDisplay({
  tierPrices,
}: {
  tierPrices: Record<string, number>
}) {
  const { activeTierId } = useTier()
  const price = tierPrices[activeTierId] ?? tierPrices["retail"]
  if (!price) return null
  return (
    <span className="text-ui-fg-muted" data-testid="price">
      {formatRub(price)}
    </span>
  )
}

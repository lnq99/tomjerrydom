export const DEFAULT_TIER_PROFIT: Record<string, number> = {
  retail: 30,
  wholesale20: 15,
  wholesale50: 10,
}

/** Derive a stable tier key from price list metadata */
export function deriveTierKey(metadata: Record<string, unknown>): string {
  if (metadata.tier_key) return metadata.tier_key as string
  const amount = (metadata.min_order_amount as number) ?? 0
  return `wholesale${Math.floor(amount / 1000)}`
}

/** Look up profit % for a tier from category metadata, falling back to defaults */
export function getTierProfit(
  categories: Array<{ metadata?: Record<string, unknown> | null }> | undefined,
  tierId: string
): number {
  if (categories) {
    for (const cat of categories) {
      const profit = (cat.metadata as any)?.tier_profit?.[tierId]
      if (typeof profit === 'number') return profit
    }
  }
  return DEFAULT_TIER_PROFIT[tierId] ?? 30
}

/** Selling price = cost × (1 + profit%) */
export function calcPrice(cost: number, profitPercent: number): number {
  return Math.round(cost * (1 + profitPercent / 100))
}

export const DEFAULT_TIER_PROFIT: Record<string, number> = {
  retail: 30,
  small_opt: 15,
  medium_opt: 10,
  large_opt: 5,
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

/** Selling price = cost × (1 + profit%), in whole rubles */
export function calcPrice(cost: number, profitPercent: number): number {
  return Math.round(cost * (1 + profitPercent / 100))
}

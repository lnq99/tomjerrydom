import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { deriveTierKey } from "./_shared"

export type Tier = {
  id: string
  label: string
  description: string
  /** minimum cart item subtotal to use this tier, in whole rubles */
  min_order_amount: number
  sort_order: number
}

const RETAIL_TIER: Tier = {
  id: "retail",
  label: "Розница",
  description: "Стандартные цены без минимального заказа",
  min_order_amount: 0,
  sort_order: 0,
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pricingService = req.scope.resolve(Modules.PRICING)

  const priceLists = await pricingService.listPriceLists(
    { status: ["active"] },
    { select: ["id", "title", "status", "metadata"] }
  )

  const tierLists: Tier[] = priceLists
    .filter((pl) => pl.metadata?.is_tier === true)
    .map((pl) => ({
      id: deriveTierKey(pl.metadata as Record<string, unknown>),
      label: (pl.metadata?.label as string) ?? pl.title,
      description: (pl.metadata?.description as string) ?? "",
      min_order_amount: (pl.metadata?.min_order_amount as number) ?? 0,
      sort_order: (pl.metadata?.sort_order as number) ?? 99,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)

  res.json({ tiers: [RETAIL_TIER, ...tierLists] })
}

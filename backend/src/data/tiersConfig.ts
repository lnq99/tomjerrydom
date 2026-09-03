export type TierDef = {
  id: string
  label: string
  description: string
  min_order_amount: number
  sort_order: number
}

export const TIERS: TierDef[] = [
  { id: "retail",     label: "Розница",     description: "Стандартные цены без минимального заказа", min_order_amount: 0,     sort_order: 0 },
  { id: "small_opt",  label: "Мелкий опт",  description: "Минимальный заказ 5 000₽",                min_order_amount: 5000,  sort_order: 1 },
  { id: "medium_opt", label: "Средний опт", description: "Минимальный заказ 10 000₽",               min_order_amount: 10000, sort_order: 2 },
  { id: "large_opt",  label: "Крупный опт", description: "Минимальный заказ 20 000₽",               min_order_amount: 20000, sort_order: 3 },
]

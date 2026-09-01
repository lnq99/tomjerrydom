import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// All amounts are whole rubles. formatRub formats directly — no ÷100.
export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

// Whole rubles as a plain string for numeric input fields.
export function displayRub(amount: number): string {
  return amount ? String(Math.round(amount)) : ""
}

// Parse a ruble string from an input field. Returns whole rubles.
export function parseRubles(value: string): number {
  const n = parseFloat(value.replace(",", "."))
  return isNaN(n) || n < 0 ? 0 : Math.round(n)
}

// Shared tier label used across POS components.
export function shortTierLabel(tier: { id: string; label: string; min_order_amount: number }): string {
  if (tier.min_order_amount === 0) return tier.label
  const r = tier.min_order_amount
  return `Sỉ ${r >= 1000 ? `${Math.round(r / 1000)}k` : r}`
}

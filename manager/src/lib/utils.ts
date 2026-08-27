import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRub(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}

export function rubles(kopecks: number): string {
  return kopecks ? String(Math.round(kopecks / 100)) : ""
}

export function toKopecks(value: string): number {
  const n = parseFloat(value.replace(",", "."))
  return isNaN(n) || n < 0 ? 0 : Math.round(n * 100)
}

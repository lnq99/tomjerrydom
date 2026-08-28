export type BankingDetails = {
  name: string
  phone: string
  qrUrl: string
}

const KEY = "pos_banking"

export function getBankingDetails(): BankingDetails {
  if (typeof window === "undefined") return { name: "", phone: "", qrUrl: "" }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { name: "", phone: "", qrUrl: "", ...JSON.parse(raw) }
  } catch {}
  return { name: "", phone: "", qrUrl: "" }
}

export function saveBankingDetails(d: BankingDetails): void {
  localStorage.setItem(KEY, JSON.stringify(d))
}

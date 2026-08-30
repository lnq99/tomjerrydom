"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { initPrimaryLocation } from "@/lib/api"

type SensitiveCtx = { show: boolean; toggle: () => void }
const Ctx = createContext<SensitiveCtx>({ show: true, toggle: () => {} })

export function SensitiveProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true)

  // Cache primary location ID on mount so all stock reads/writes use the same location
  useEffect(() => { initPrimaryLocation().catch(() => {}) }, [])

  return <Ctx.Provider value={{ show, toggle: () => setShow((s) => !s) }}>{children}</Ctx.Provider>
}

export function useSensitive() { return useContext(Ctx) }

export function maskPhone(phone: string): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.length <= 5) return "***"
  const prefix = phone.slice(0, 3)
  const suffix = phone.slice(-2)
  return `${prefix}***${suffix}`
}

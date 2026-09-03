"use client"

import { createContext, useContext, useState } from "react"

type TierContextValue = {
  activeTierId: string
  setActiveTierId: (id: string) => void
}

const TierContext = createContext<TierContextValue>({
  activeTierId: "retail",
  setActiveTierId: () => {},
})

export function TierProvider({
  children,
  initialTierId,
}: {
  children: React.ReactNode
  initialTierId: string
}) {
  const [activeTierId, setActiveTierId] = useState(initialTierId)
  return (
    <TierContext.Provider value={{ activeTierId, setActiveTierId }}>
      {children}
    </TierContext.Provider>
  )
}

export function useTier() {
  return useContext(TierContext)
}

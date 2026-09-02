"use client"

import { addToCart } from "@lib/data/cart"
import { useState, useTransition } from "react"

type QuickAddButtonProps = {
  variantId: string
  countryCode: string
}

export default function QuickAddButton({ variantId, countryCode }: QuickAddButtonProps) {
  const [added, setAdded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending || added) return

    startTransition(async () => {
      try {
        await addToCart({ variantId, quantity: 1, countryCode })
        setAdded(true)
        setTimeout(() => setAdded(false), 1500)
      } catch {
        // silently ignore — user can navigate to product page to add
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Добавить в корзину"
      className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-ui-fg-base text-white shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50"
      disabled={isPending}
    >
      {added ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      ) : isPending ? (
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 10h-2A8 8 0 014 12z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      )}
    </button>
  )
}

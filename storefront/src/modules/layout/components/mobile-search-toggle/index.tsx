"use client"

import { useState } from "react"
import SearchBox from "@modules/layout/components/search-box"

export default function MobileSearchToggle() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Поиск"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 text-ui-fg-subtle hover:text-ui-fg-base small:hidden"
      >
        {open ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path strokeLinecap="round" d="m13.5 13.5 3 3" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-ui-border-base px-4 py-3 small:hidden z-40">
          <SearchBox className="w-full" />
        </div>
      )}
    </>
  )
}

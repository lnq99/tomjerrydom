"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function SearchBox({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  const submit = (q: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (q) {
      params.set("q", q)
    } else {
      params.delete("q")
    }
    params.delete("page")
    router.push(pathname + (params.toString() ? "?" + params.toString() : ""))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(query.trim())
  }

  const handleClear = () => {
    setQuery("")
    submit("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className ?? ""}`}
      role="search"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск..."
        aria-label="Поиск товаров"
        className="h-9 w-full pl-3 pr-16 border border-ui-border-base rounded-rounded bg-ui-bg-subtle text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:border-ui-border-interactive transition-colors"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Очистить"
          className="absolute right-9 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-ui-fg-muted hover:text-ui-fg-base"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
      <button
        type="submit"
        aria-label="Найти"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-ui-fg-muted hover:text-ui-fg-base"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path strokeLinecap="round" d="m13.5 13.5 3 3" />
        </svg>
      </button>
    </form>
  )
}

"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function ViewToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get("view") ?? "grid"

  const setView = (v: "grid" | "list") => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === "grid") {
      params.delete("view")
    } else {
      params.set("view", v)
    }
    router.replace(pathname + (params.toString() ? "?" + params.toString() : ""))
  }

  return (
    <div className="flex items-center gap-1" aria-label="Вид отображения">
      <button
        type="button"
        onClick={() => setView("grid")}
        aria-pressed={current === "grid"}
        aria-label="Сетка"
        className={`p-1.5 rounded transition-colors ${
          current === "grid"
            ? "text-ui-fg-base bg-ui-bg-base-hover"
            : "text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M5 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5ZM5 11a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5ZM11 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V5ZM11 13a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2Z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setView("list")}
        aria-pressed={current === "list"}
        aria-label="Список"
        className={`p-1.5 rounded transition-colors ${
          current === "list"
            ? "text-ui-fg-base bg-ui-bg-base-hover"
            : "text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

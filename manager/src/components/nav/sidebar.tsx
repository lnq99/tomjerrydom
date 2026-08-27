"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ShoppingCart, ClipboardList, Package, BarChart2, Settings, LogOut, LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"
import { clearToken } from "@/lib/api"

const items = [
  { href: "/pos", icon: ShoppingCart, label: "Касса" },
  { href: "/orders", icon: ClipboardList, label: "Заказы" },
  { href: "/products", icon: Package, label: "Товары" },
  { href: "/catalog", icon: LayoutList, label: "Каталог" },
  { href: "/analytics", icon: BarChart2, label: "Аналитика" },
  { href: "/pricing", icon: Settings, label: "Ценообразование" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    clearToken()
    router.push("/login")
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r bg-background h-screen sticky top-0">
      <div className="px-4 py-5 border-b">
        <span className="text-lg font-bold">TomJerry</span>
        <span className="text-sm text-muted-foreground block">Панель управления</span>
      </div>

      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 border-t">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  )
}

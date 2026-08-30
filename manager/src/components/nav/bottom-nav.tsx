"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart, ClipboardList, Package, Users, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSensitive } from "@/lib/sensitive-context"

const items = [
  { href: "/pos", icon: ShoppingCart, label: "Quầy bán" },
  { href: "/orders", icon: ClipboardList, label: "Đơn hàng" },
  { href: "/customers", icon: Users, label: "Khách hàng" },
  { href: "/products", icon: Package, label: "Sản phẩm" },
]

export function BottomNav() {
  const pathname = usePathname()
  const { show: showSensitive, toggle: toggleSensitive } = useSensitive()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-background md:hidden">
      <div className="flex">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={toggleSensitive}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
            showSensitive ? "text-muted-foreground" : "text-amber-500"
          )}
        >
          {showSensitive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          <span>{showSensitive ? "Ẩn" : "Hiện"}</span>
        </button>
      </div>
    </nav>
  )
}

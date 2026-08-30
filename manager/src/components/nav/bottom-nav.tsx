"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart, ClipboardList, Package, BarChart2, Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/pos", icon: ShoppingCart, label: "Quầy bán" },
  { href: "/orders", icon: ClipboardList, label: "Đơn hàng" },
  { href: "/products", icon: Package, label: "Sản phẩm" },
  { href: "/analytics", icon: BarChart2, label: "Phân tích" },
  { href: "/media", icon: Clapperboard, label: "Truyền thông" },
]

export function BottomNav() {
  const pathname = usePathname()

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
      </div>
    </nav>
  )
}

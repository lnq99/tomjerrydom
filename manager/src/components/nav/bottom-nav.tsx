"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShoppingCart, ClipboardList, Package, Users, Eye, EyeOff,
  MoreHorizontal, LayoutList, BarChart2, Settings, Clapperboard, UserCircle, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSensitive } from "@/lib/sensitive-context"

const PRIMARY_ITEMS = [
  { href: "/pos",      icon: ShoppingCart,  label: "Quầy bán" },
  { href: "/orders",   icon: ClipboardList, label: "Đơn hàng" },
  { href: "/products", icon: Package,       label: "Sản phẩm" },
]

const MORE_ITEMS = [
  { href: "/customers", icon: Users,        label: "Khách hàng" },
  { href: "/catalog",   icon: LayoutList,   label: "Danh mục" },
  { href: "/analytics", icon: BarChart2,    label: "Phân tích" },
  { href: "/pricing",   icon: Settings,     label: "Định giá" },
  { href: "/media",     icon: Clapperboard, label: "Truyền thông" },
  { href: "/profile",   icon: UserCircle,   label: "Hồ sơ" },
]

export function BottomNav() {
  const pathname = usePathname()
  const { show: showSensitive, toggle: toggleSensitive } = useSensitive()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.href))

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-16 inset-x-0 z-50 bg-background border-t rounded-t-xl pb-2 md:hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b">
              <span className="text-sm font-medium text-muted-foreground">Khác</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3">
              {MORE_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-4 text-xs transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-background md:hidden">
        <div className="flex">
          {PRIMARY_ITEMS.map((item) => {
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
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
              isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Khác</span>
          </button>

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
    </>
  )
}

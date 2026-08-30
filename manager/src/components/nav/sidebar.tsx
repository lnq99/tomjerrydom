"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ShoppingCart, ClipboardList, Package, BarChart2, Settings, LogOut, LayoutList, Clapperboard, UserCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { clearToken } from "@/lib/api"
import { useState, useEffect } from "react"

const items = [
  { href: "/pos", icon: ShoppingCart, label: "Quầy bán" },
  { href: "/orders", icon: ClipboardList, label: "Đơn hàng" },
  { href: "/products", icon: Package, label: "Sản phẩm" },
  { href: "/catalog", icon: LayoutList, label: "Danh mục" },
  { href: "/analytics", icon: BarChart2, label: "Phân tích" },
  { href: "/pricing", icon: Settings, label: "Định giá" },
  { href: "/media", icon: Clapperboard, label: "Truyền thông" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar_collapsed") === "1")
    } catch {}
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem("sidebar_collapsed", next ? "1" : "0") } catch {}
  }

  function handleLogout() {
    clearToken()
    router.push("/login")
  }

  return (
    <aside className={cn(
      "hidden md:flex md:flex-col md:shrink-0 border-r bg-background h-screen sticky top-0 transition-all duration-200",
      collapsed ? "md:w-[52px]" : "md:w-56"
    )}>
      {/* Brand */}
      <div className={cn(
        "flex items-center border-b shrink-0 transition-all",
        collapsed ? "px-0 py-4 justify-center" : "px-4 py-5"
      )}>
        {collapsed ? (
          <span className="text-lg font-bold leading-none">T</span>
        ) : (
          <div>
            <span className="text-lg font-bold">TomJerry</span>
            <span className="text-sm text-muted-foreground block">Bảng điều khiển</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-1.5 py-3 flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      <div className={cn("px-1.5 py-3 border-t space-y-0.5")}>
        <Link
          href="/profile"
          title={collapsed ? "Hồ sơ" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
            pathname.startsWith("/profile")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <UserCircle className="h-4 w-4 shrink-0" />
          {!collapsed && "Hồ sơ"}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? "Đăng xuất" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Đăng xuất"}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Mở rộng" : "Thu gọn"}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" /><span>Thu gọn</span></>
          }
        </button>
      </div>
    </aside>
  )
}

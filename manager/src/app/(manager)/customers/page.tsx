"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { listCustomers, type CustomerProfile } from "@/lib/api"
import { formatRub } from "@/lib/utils"
import { format } from "date-fns"

export default function CustomersPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    staleTime: 60_000,
  })

  const customers = (data?.customers ?? []).filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 pt-4 pb-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Khách hàng</h1>
          <span className="text-xs text-muted-foreground">{data?.customers.length ?? 0} khách</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm tên hoặc số điện thoại..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Đang tải...</div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-30" />
            <span className="text-sm">Không có khách hàng</span>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((c, i) => (
              <CustomerRow key={i} customer={c} onClick={() => router.push(`/orders/${c.last_order_id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomerRow({ customer: c, onClick }: { customer: CustomerProfile; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors">
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
        {(c.name || c.phone).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{c.name || "—"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {c.phone && <span>{c.phone} · </span>}
          {c.order_count} đơn · {formatRub(c.total_spent)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{format(new Date(c.last_order_at), "d MMM")}</p>
        <p className="text-xs text-muted-foreground">#{c.last_order_display_id}</p>
      </div>
    </button>
  )
}

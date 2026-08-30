import { Sidebar } from "@/components/nav/sidebar"
import { BottomNav } from "@/components/nav/bottom-nav"
import { SensitiveProvider } from "@/lib/sensitive-context"

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SensitiveProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </SensitiveProvider>
  )
}

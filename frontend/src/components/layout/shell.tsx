"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { 
  LayoutDashboard, Package, ShoppingCart, MessageSquare, Settings, 
  LogOut, Store, Menu, X, ChevronRight, Moon, Sun, Users, Bell
} from "lucide-react"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Analytics & overview" },
  { href: "/products", label: "Products", icon: Package, description: "Inventory management" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, description: "Sales & fulfillment" },
  { href: "/customers", label: "Customers", icon: Users, description: "Customer profiles" },
  { href: "/bargains", label: "Bargains", icon: MessageSquare, description: "AI negotiations" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Business profile" },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("bizzy_dark_mode")
    const isDark = saved ? saved === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add("dark")
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("bizzy_dark_mode", String(darkMode))
  }, [darkMode, mounted])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {nav.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
              active
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${mobile ? "" : "hover:translate-x-1"}`}
          >
            <div className={`rounded-lg p-1.5 transition-colors ${
              active ? "bg-primary-foreground/20" : "bg-muted group-hover:bg-background"
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.label}</p>
              {mobile && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
            {active && !mobile && (
              <ChevronRight className="h-4 w-4 opacity-60 animate-fade-in" />
            )}
          </Link>
        )
      })}
    </>
  )

  if (!mounted) return null

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card/50 backdrop-blur-xl">
        <div className="p-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="rounded-xl bg-primary p-2.5 shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Bizzy</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Admin Dashboard</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Menu
          </p>
          <NavLinks />
        </nav>

        <div className="p-3 border-t space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground rounded-xl"
            onClick={toggleDarkMode}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-xl"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1.5">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">Bizzy</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
        mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}>
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div className={`absolute right-0 top-0 bottom-0 w-80 bg-card shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary p-1.5">
                  <Store className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">Bizzy</span>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)} className="rounded-lg">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <NavLinks mobile />
            </nav>
            <div className="p-4 border-t space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground rounded-xl"
                onClick={toggleDarkMode}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {darkMode ? "Light Mode" : "Dark Mode"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}

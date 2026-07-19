"use client"

import { useEffect, useState, useRef } from "react"
import { Shell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getAnalyticsOverview } from "@/lib/api"
import { formatNaira } from "@/lib/utils"
import { OverviewChart } from "@/components/charts/overview-chart"
import { RecentOrders } from "@/components/recent-orders"
import { TopProductsWidget } from "@/components/dashboard/TopProductsWidget"
import { RecentBargainsWidget } from "@/components/dashboard/RecentBargainsWidget"
import { SalesTrendWidget } from "@/components/dashboard/SalesTrendWidget"
import { TrendingUp, Package, Clock, AlertTriangle, ArrowUpRight, Zap, ShoppingBag, Tag, BarChart3 } from "lucide-react"

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const duration = 1200
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [started, value])

  return (
    <span ref={ref}>
      {prefix}{display.toLocaleString("en-NG")}{suffix}
    </span>
  )
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalyticsOverview()
      .then((data) => {
        setOverview(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stats = [
    {
      title: "Total Revenue",
      value: overview?.total_revenue || 0,
      prefix: "₦",
      sub: `${overview?.completed_orders_count || 0} completed orders`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "stat-card-revenue",
      iconBg: "bg-emerald-100",
      trend: "+12.5%",
    },
    {
      title: "Active Products",
      value: overview?.active_products_count || 0,
      sub: "In catalog",
      icon: Package,
      color: "text-blue-600",
      bg: "stat-card-products",
      iconBg: "bg-blue-100",
      trend: "+3",
    },
    {
      title: "Pending Orders",
      value: overview?.pending_orders_count || 0,
      sub: "Awaiting fulfillment",
      icon: Clock,
      color: "text-amber-600",
      bg: "stat-card-orders",
      iconBg: "bg-amber-100",
      trend: "-2",
    },
    {
      title: "Low Stock",
      value: overview?.low_stock_alerts?.length || 0,
      sub: "Items need restocking",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "stat-card-alert",
      iconBg: "bg-red-100",
      trend: null,
    },
  ]

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-primary animate-pulse" />
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Overview of your business performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <Card
                key={stat.title}
                className={`${stat.bg} border-2 hover-lift animate-fade-in stagger-${i + 1} opacity-0`}
                style={{ animationFillMode: "forwards" }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`rounded-xl p-2.5 ${stat.iconBg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-9 w-28 rounded-lg" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">
                      <AnimatedNumber value={stat.value} prefix={stat.prefix} />
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                    {stat.trend && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.trend.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                        {stat.trend.startsWith("+") ? <ArrowUpRight className="h-3 w-3" /> : null}
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Low Stock Alerts */}
        {!loading && overview?.low_stock_alerts?.length > 0 && (
          <div className="animate-fade-in-scale rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-full bg-red-100 p-1.5 animate-pulse">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="font-semibold text-red-800">Low Stock Alerts</h3>
              <Badge variant="outline" className="bg-white text-red-700 border-red-200 ml-auto">
                {overview.low_stock_alerts.length} items
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {overview.low_stock_alerts.map((alert: any, i: number) => (
                <Badge
                  key={alert.product_id}
                  variant="outline"
                  className="bg-white/80 text-red-700 border-red-200 hover:bg-red-50 transition-colors cursor-default animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <span className="font-medium">{alert.name}</span>
                  <span className="mx-1 text-red-400">·</span>
                  <span className="text-red-500">{alert.quantity} left</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
          <Card className="lg:col-span-4 hover-lift animate-fade-in stagger-3 opacity-0" style={{ animationFillMode: "forwards" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OverviewChart />
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 hover-lift animate-fade-in stagger-4 opacity-0" style={{ animationFillMode: "forwards" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentOrders />
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="hover-lift animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesTrendWidget />
            </CardContent>
          </Card>

          <Card className="hover-lift animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                Top Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopProductsWidget />
            </CardContent>
          </Card>

          <Card className="hover-lift animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-red-500" />
                Recent Bargains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentBargainsWidget />
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}
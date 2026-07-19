"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { getAnalyticsPerformance } from "@/lib/api"
import { formatNaira } from "@/lib/utils"

export function PerformanceChart() {
  const [data, setData] = useState<Array<{ name: string; units: number; revenue: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalyticsPerformance()
      .then((perf) => {
        setData(perf.map((p: any) => ({
          name: p.name,
          units: p.units_sold,
          revenue: p.revenue_generated,
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-[300px] w-full" />

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No product performance data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number, name: string) => [name === "revenue" ? formatNaira(v) : v, name === "revenue" ? "Revenue" : "Units"]} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
        <Area type="monotone" dataKey="revenue" stroke="currentColor" className="text-primary" fill="currentColor" fillOpacity={0.15} />
        <Area type="monotone" dataKey="units" stroke="currentColor" className="text-muted-foreground" fill="currentColor" fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

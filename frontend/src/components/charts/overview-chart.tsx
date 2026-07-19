"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { getDailyRevenue } from "@/lib/api"
import { formatNaira } from "@/lib/utils"
import { DailyRevenue } from "@/lib/api"


export function OverviewChart() {
  const [data, setData] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDailyRevenue()
      .then((daily) => {
        // Show every 5th day label to avoid crowding
        const chartData = daily.map((d: DailyRevenue, i: number) => ({
          ...d,
          label: i % 5 === 0 ? d.day : "",
        }))
        setData(chartData)
        setLoading(false)
      })
      .catch(() => {
        // Fallback to old endpoint if daily not available
        setData([])
        setLoading(false)
      })
  }, [])

  if (loading) return <Skeleton className="h-[350px] w-full rounded-xl" />

  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
        No revenue data available yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
        <XAxis 
          dataKey="label" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} 
        />
        <Tooltip 
          formatter={(v: number) => [formatNaira(v), "Revenue"]} 
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload
            return item ? `${item.day}, ${item.date}` : label
          }}
          cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
          contentStyle={{ 
            borderRadius: "12px", 
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
          }}
        />
        <Bar 
          dataKey="revenue" 
          fill="hsl(var(--primary))" 
          radius={[6, 6, 0, 0]} 
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
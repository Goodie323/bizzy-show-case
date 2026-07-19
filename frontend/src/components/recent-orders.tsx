"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getOrders } from "@/lib/api"
import { formatNaira, formatPhone, getInitials } from "@/lib/utils"

interface Order {
  id: number
  customer_number: string
  order_reference: string
  total_amount: number
  order_status: string
  payment_status: string
  created_at: string
}

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrders()
      .then((data) => {
        const sorted = data
          .sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        setOrders(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No orders yet. Sales will appear here once customers start buying.
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
            {getInitials(order.customer_number)}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{formatPhone(order.customer_number)}</p>
              <p className="text-xs text-muted-foreground">{order.order_reference}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatNaira(order.total_amount)}</p>
              <Badge variant="outline" className={`text-xs ${statusColor[order.order_status] || ""}`}>
                {order.order_status}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

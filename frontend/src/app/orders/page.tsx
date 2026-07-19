"use client"

import { useEffect, useState } from "react"
import { Shell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import { formatNaira, formatPhone } from "@/lib/utils"
import { ShoppingCart, Loader2, Eye, Package, Truck, CreditCard, User, MapPin, ChevronRight, CheckCircle2, Clock } from "lucide-react"
import { getOrders, Order, updateOrderStatus } from "@/lib/api"

interface OrderItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total: number
}


const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock, label: "Pending" },
  confirmed: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: CheckCircle2, label: "Confirmed" },
  processing: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Package, label: "Processing" },
  shipped: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Truck, label: "Shipped" },
  delivered: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2, label: "Delivered" },
  completed: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2, label: "Completed" },
  cancelled: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: Clock, label: "Cancelled" },
}

const paymentColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
}

const orderSteps = ["pending", "confirmed", "processing", "shipped", "delivered", "completed"]

function OrderProgress({ status }: { status: string }) {
  const currentIndex = orderSteps.indexOf(status)
  const progress = status === "cancelled" ? 0 : ((currentIndex + 1) / orderSteps.length) * 100

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
        <span>Order Placed</span>
        <span>Completed</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${status === "cancelled" ? "bg-red-400" : "bg-gradient-to-r from-blue-500 to-emerald-500"}`} style={{ width: `${Math.max(progress, 8)}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        {orderSteps.map((step, i) => (
          <div key={step} className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i <= currentIndex && status !== "cancelled" ? "bg-primary scale-125" : "bg-muted-foreground/20"}`} />
        ))}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const loadOrders = () => {
    setLoading(true)
    getOrders()
      .then((data) => {
        setOrders(data.sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId)
    try { await updateOrderStatus(orderId, { order_status: newStatus }); loadOrders() }
    catch (err: any) { alert(err.message) }
    finally { setUpdatingId(null) }
  }

  const openDetail = (order: Order) => { setSelectedOrder(order); setDetailOpen(true) }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Orders
          </h1>
          <p className="text-muted-foreground">Track and manage customer orders</p>
        </div>

        <Card className="overflow-hidden animate-fade-in stagger-1" style={{ animationFillMode: "forwards", opacity: 0 }}>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
                <div className="rounded-2xl bg-muted p-4 mb-4">
                  <ShoppingCart className="h-10 w-10 opacity-40" />
                </div>
                <p className="font-medium">No orders yet</p>
                <p className="text-sm mt-1">Orders will appear here when customers buy via WhatsApp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Reference</th>
                      <th className="px-6 py-3 font-medium hidden sm:table-cell">Customer</th>
                      <th className="px-6 py-3 font-medium hidden md:table-cell">Items</th>
                      <th className="px-6 py-3 font-medium">Total</th>
                      <th className="px-6 py-3 font-medium hidden lg:table-cell">Payment</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium hidden md:table-cell">Date</th>
                      <th className="px-6 py-3 font-medium text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedOrders.map((order, i) => {
                      const config = statusConfig[order.order_status] || statusConfig.pending
                      const StatusIcon = config.icon
                      return (
                        <tr key={order.id} className="border-b last:border-0 table-row-animate group cursor-pointer" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => openDetail(order)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">{order.order_reference}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                {order.customer_number.slice(-2).toUpperCase()}
                              </div>
                              {formatPhone(order.customer_number)}
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">{order.items_ordered?.length || 0} items</td>
                          <td className="px-6 py-4 font-semibold">{formatNaira(order.total_amount)}</td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <Badge variant="outline" className={`rounded-full ${paymentColors[order.payment_status] || ""}`}>
                              {order.payment_status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            {updatingId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <select value={order.order_status} onChange={(e) => handleStatusChange(order.id, e.target.value)} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color} cursor-pointer hover:shadow-sm transition-shadow`}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">
                            {new Date(order.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openDetail(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {orders.length > itemsPerPage && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={orders.length} itemsPerPage={itemsPerPage} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {selectedOrder && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg">{selectedOrder.order_reference}</span>
                  <p className="text-xs font-normal text-muted-foreground">
                    {new Date(selectedOrder.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">Order details</DialogDescription>
            </DialogHeader>
            <DialogContent className="max-w-lg space-y-6">
              <OrderProgress status={selectedOrder.order_status} />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Customer</p>
                    <p className="text-sm font-semibold">{formatPhone(selectedOrder.customer_number)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="rounded-lg bg-emerald-500/10 p-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Payment</p>
                    <p className="text-sm font-semibold capitalize">{selectedOrder.payment_status}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.payment_method || "Bank Transfer"}</p>
                  </div>
                </div>
              </div>
              {selectedOrder.delivery_address && (
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                  <div className="rounded-lg bg-blue-500/10 p-1.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Delivery Address</p>
                    <p className="text-sm">{selectedOrder.delivery_address}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Items Ordered</p>
                <div className="rounded-xl border divide-y overflow-hidden">
                  {selectedOrder.items_ordered?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{formatNaira(item.unit_price)} each</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">{formatNaira(item.total)}</p>
                    </div>
                  )) || <p className="p-3 text-sm text-muted-foreground">No item details</p>}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/60 to-muted/30">
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-xl font-bold text-primary">{formatNaira(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>
              {selectedOrder.notes && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-amber-700 font-medium mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{selectedOrder.notes}</p>
                </div>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Shell>
  )
}
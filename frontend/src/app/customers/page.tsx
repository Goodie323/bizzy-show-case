"use client"

import { useState, useMemo, useEffect } from "react"
import { Shell } from "@/components/layout/shell"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomerCard } from "@/components/customers/CustomerCard"
import { CustomerOrdersModal } from "@/components/customers/CustomerOrdersModal"
import { Customer, extractCustomersFromOrders } from "@/lib/utils/customers"
import { getOrders } from "@/lib/api"
import { Search, Users, Filter, AlertCircle } from "lucide-react"

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "vip" | "inactive">("all")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getOrders()
      .then((data) => {
        setOrders(data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Failed to load customers")
        setLoading(false)
      })
  }, [])

  const customers = useMemo(() => extractCustomersFromOrders(orders), [orders])

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [customers, searchQuery, statusFilter])

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === "active").length,
    vip: customers.filter(c => c.status === "vip").length,
    inactive: customers.filter(c => c.status === "inactive").length,
  }), [customers])

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          </div>
          <p className="text-muted-foreground">Manage and view all your customers</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "Active", value: stats.active, color: "bg-green-50 text-green-700 border-green-200" },
            { label: "VIP", value: stats.vip, color: "bg-purple-50 text-purple-700 border-purple-200" },
            { label: "Inactive", value: stats.inactive, color: "bg-gray-50 text-gray-600 border-gray-200" },
          ].map((stat) => (
            <Card key={stat.label} className={`${stat.color} border-2`}>
              <CardContent className="p-4 text-center">
                {loading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
                <p className="text-sm opacity-80 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["all", "active", "vip", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Customer Grid */}
        {!loading && filteredCustomers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer, index) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                index={index}
                onClick={() => setSelectedCustomer(customer)}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedCustomer && (
          <CustomerOrdersModal
            customer={selectedCustomer}
            orders={orders}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    </Shell>
  )
}

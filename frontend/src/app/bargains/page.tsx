"use client"

import { useEffect, useState } from "react"
import { Shell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"
import { getBargains } from "@/lib/api"
import { formatNaira, formatPhone } from "@/lib/utils"
import { MessageSquare, TrendingDown, CheckCircle, XCircle, Clock, Zap, Target, Percent, TrendingUp } from "lucide-react"



const outcomeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  accepted: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Accepted" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Rejected" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Pending" },
}

function StatCard({ title, value, sub, icon: Icon, color, bg, delay }: any) {
  return (
    <Card className={`${bg} border-2 hover-lift animate-fade-in`} style={{ animationDelay: `${delay}s`, animationFillMode: "forwards", opacity: 0 }}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`rounded-lg p-2 ${color.replace("text-", "bg-").replace("600", "100")}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function BargainsPage() {
  const [bargains, setBargains] = useState<Bargain[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    getBargains()
      .then((data) => {
        setBargains(data.sort((a: Bargain, b: Bargain) => new Date(b.started_at || b.created_at || 0).getTime() - new Date(a.started_at || a.created_at || 0).getTime()))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalPages = Math.ceil(bargains.length / itemsPerPage)
  const paginatedBargains = bargains.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const stats = {
    total: bargains.length,
    accepted: bargains.filter((b) => b.outcome === "accepted").length,
    rejected: bargains.filter((b) => b.outcome === "rejected").length,
    pending: bargains.filter((b) => b.outcome === "pending").length,
    totalDiscount: bargains.reduce((sum, b) => sum + (b.discount_amount || 0), 0),
    avgRounds: bargains.length > 0 ? (bargains.reduce((sum, b) => sum + (b.negotiation_rounds || 0), 0) / bargains.length).toFixed(1) : "0",
  }

  const acceptanceRate = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0

  return (
    <Shell>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            AI Bargains
          </h1>
          <p className="text-muted-foreground">Customer negotiation history via WhatsApp AI</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Total" value={stats.total} icon={Zap} color="text-blue-600" bg="stat-card-products" delay={0} />
          <StatCard title="Accepted" value={stats.accepted} sub={`${acceptanceRate}% rate`} icon={CheckCircle} color="text-emerald-600" bg="stat-card-revenue" delay={0.05} />
          <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="text-red-600" bg="stat-card-alert" delay={0.1} />
          <StatCard title="Pending" value={stats.pending} icon={Clock} color="text-amber-600" bg="stat-card-orders" delay={0.15} />
          <StatCard title="Avg Rounds" value={stats.avgRounds} sub="Per negotiation" icon={Target} color="text-purple-600" bg="border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50" delay={0.2} />
        </div>

        {stats.totalDiscount > 0 && (
          <div className="animate-fade-in stagger-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 flex items-center gap-4" style={{ animationFillMode: "forwards", opacity: 0 }}>
            <div className="rounded-full bg-emerald-100 p-3">
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Total Discounts Given</p>
              <p className="text-2xl font-bold text-emerald-700">{formatNaira(stats.totalDiscount)}</p>
            </div>
            <div className="ml-auto">
              <div className="h-12 w-12 rounded-full border-4 border-emerald-200 flex items-center justify-center">
                <Percent className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        )}

        <Card className="overflow-hidden animate-fade-in stagger-3" style={{ animationFillMode: "forwards", opacity: 0 }}>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negotiation Log</CardTitle>
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
            ) : bargains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
                <div className="rounded-2xl bg-muted p-4 mb-4">
                  <MessageSquare className="h-10 w-10 opacity-40" />
                </div>
                <p className="font-medium">No bargaining history yet</p>
                <p className="text-sm mt-1">AI negotiations will appear here when customers haggle via WhatsApp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Original</th>
                      <th className="px-6 py-3 font-medium">Final</th>
                      <th className="px-6 py-3 font-medium">Discount</th>
                      <th className="px-6 py-3 font-medium hidden sm:table-cell">Rounds</th>
                      <th className="px-6 py-3 font-medium">Outcome</th>
                      <th className="px-6 py-3 font-medium hidden md:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedBargains.map((bargain, i) => {
                      const config = outcomeConfig[bargain.outcome] || outcomeConfig.pending
                      const Icon = config.icon
                      const hasDiscount = bargain.discount_amount > 0
                      return (
                        <tr key={bargain.id} className="border-b last:border-0 table-row-animate group" style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                {bargain.customer_number.slice(-2).toUpperCase()}
                              </div>
                              <span>{formatPhone(bargain.customer_number)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground line-through decoration-red-300">{formatNaira(bargain.original_price)}</td>
                          <td className="px-6 py-4 font-semibold text-emerald-700">{formatNaira(bargain.final_price)}</td>
                          <td className="px-6 py-4">
                            {hasDiscount ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 border border-red-100">
                                <TrendingDown className="h-3 w-3" />
                                {formatNaira(bargain.discount_amount)}
                                <span className="text-red-400">({bargain.discount_percentage?.toFixed(1)}%)</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No discount</span>
                            )}
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium">
                              <Target className="h-3 w-3" />
                              {bargain.negotiation_rounds}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`rounded-full ${config.bg} ${config.color}`}>
                              <Icon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">
                            {new Date(bargain.started_at || bargain.created_at || Date.now()).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {bargains.length > itemsPerPage && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={bargains.length} itemsPerPage={itemsPerPage} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}
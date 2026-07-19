"use client"

import { useEffect, useState } from "react"
import { Shell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getMerchant, updateMerchant } from "@/lib/api"
import { Loader2, Store, Phone, Globe, CreditCard, Shield, CheckCircle } from "lucide-react"

interface Merchant {
  id: number
  bizzy_number: string
  owner_personal_number: string
  business_name: string
  preferred_language: string
  payment_details: string
  is_active: boolean
}

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({
    business_name: "",
    preferred_language: "English",
    payment_details: "",
    is_active: true,
  })

  useEffect(() => {
    getMerchant()
      .then((data) => {
        setMerchant(data)
        setFormData({
          business_name: data.business_name || "",
          preferred_language: data.preferred_language || "English",
          payment_details: data.payment_details || "",
          is_active: data.is_active ?? true,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const updated = await updateMerchant({
        business_name: formData.business_name,
        preferred_language: formData.preferred_language,
        payment_details: formData.payment_details,
        is_active: formData.is_active,
      })
      setMerchant(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your business profile and preferences</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Profile Card */}
          <Card className="overflow-hidden animate-fade-in stagger-1" style={{ animationFillMode: "forwards", opacity: 0 }}>
            <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10" />
            <CardContent className="-mt-12 pb-6">
              <div className="flex items-end gap-4">
                <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                  <Store className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="pb-2">
                  <h2 className="text-xl font-bold">{merchant?.business_name || "Your Business"}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={merchant?.is_active ? "default" : "secondary"} className="rounded-full">
                      {merchant?.is_active ? "Active" : "Paused"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{merchant?.bizzy_number}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Card */}
          <Card className="animate-fade-in stagger-2" style={{ animationFillMode: "forwards", opacity: 0 }}>
            <CardHeader>
              <CardTitle className="text-lg">Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="bizzy_number" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Bizzy WhatsApp Number
                    </Label>
                    <Input
                      id="bizzy_number"
                      value={merchant?.bizzy_number || ""}
                      disabled
                      className="bg-muted/50 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Your registered WhatsApp business line cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_name" className="flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      Business Name
                    </Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      Preferred Language
                    </Label>
                    <select
                      id="language"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.preferred_language}
                      onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Pidgin">Nigerian Pidgin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment" className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      Payment Details
                    </Label>
                    <Input
                      id="payment"
                      value={formData.payment_details}
                      onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                      placeholder="Bank: GTBank, Account: 0123456789, Name: John Doe"
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Shown to customers for bank transfers during checkout</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      Account Status
                    </Label>
                    <select
                      id="status"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                      value={String(formData.is_active)}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}
                    >
                      <option value="true">Active — Receiving orders</option>
                      <option value="false">Paused — Not receiving orders</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={saving} className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Changes
                    </Button>
                    {saved && (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-600 animate-fade-in">
                        <CheckCircle className="h-4 w-4" />
                        Saved!
                      </div>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { onboardMerchant } from "@/lib/api"
import { Store, Loader2, ArrowRight, CheckCircle, Landmark, Phone, CreditCard, BadgePercent, ShieldCheck, Info } from "lucide-react"

function FloatingShape({ delay, size, x, y, color }: { delay: number; size: number; x: string; y: string; color: string }) {
  return (
    <div
      className="absolute rounded-full opacity-20 animate-float pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: color,
        animationDelay: `${delay}s`,
        animationDuration: `${6 + delay * 2}s`,
      }}
    />
  )
}

export default function OnboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<"form" | "submitting" | "success">("form")
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    business_name: "",
    phone: "",
    payment_details: "",
    settlement_bank_name: "",
    settlement_account_number: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep("submitting")
    setError("")

    try {
      const res = await onboardMerchant({
        business_name: formData.business_name,
        // Since Meta verification is pending, use their current WhatsApp for both
        bizzy_number: formData.phone,
        owner_personal_number: formData.phone,
        preferred_language: "English",
        payment_details: formData.payment_details,
        settlement_bank_name: formData.settlement_bank_name,
        settlement_account_number: formData.settlement_account_number,
        agree_to_platform_fee: true,
      })

      if (res.status === "active" || res.status === "partial" || res.access_token) {
        // Auto-login: store token and merchant data
        if (res.access_token) {
          localStorage.setItem("bizzy_token", res.access_token)
          localStorage.setItem("bizzy_merchant_id", String(res.id))
        }
        setStep("success")
        // Hard reload to dashboard so all data fetches fresh
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1500)
      } else {
        throw new Error(res.message || "Onboarding failed")
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setStep("form")
    }
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      <FloatingShape delay={0} size={300} x="-5%" y="10%" color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" />
      <FloatingShape delay={1} size={200} x="70%" y="-5%" color="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" />
      <FloatingShape delay={2} size={150} x="80%" y="60%" color="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" />
      <FloatingShape delay={1.5} size={100} x="10%" y="70%" color="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" />

      <div className="relative z-10 w-full max-w-lg px-4 py-8">
        <div className="flex justify-center mb-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative rounded-2xl bg-emerald-600 p-4 shadow-2xl shadow-emerald-500/30">
              <Store className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-2xl shadow-black/5 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 animate-fade-in-scale">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {step === "form" && "Create Your Bizzy Account"}
              {step === "submitting" && "Setting Up..."}
              {step === "success" && "Welcome Aboard!"}
            </CardTitle>
            <CardDescription>
              {step === "form" && "Your AI sales rep is almost ready"}
              {step === "submitting" && "Creating your Paystack subaccount..."}
              {step === "success" && "Redirecting to your dashboard..."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            {/* Meta notice */}
            {step === "form" && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  <span className="font-semibold">WhatsApp Business API is being configured.</span> Use your current WhatsApp number for now — you can update it later when Meta verification is complete.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            {step === "form" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name" className="flex items-center gap-2 text-sm font-medium">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    Business Name
                  </Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="e.g. JD Fashion Store"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Your WhatsApp Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+2348012345678"
                    required
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your login number and temporary business line until Meta verification is complete.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_details" className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    Payment Details (shown to customers)
                  </Label>
                  <Input
                    id="payment_details"
                    value={formData.payment_details}
                    onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                    placeholder="GTBank 0123456789 John Doe"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name" className="flex items-center gap-2 text-sm font-medium">
                      <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                      Settlement Bank
                    </Label>
                    <select
                      id="bank_name"
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.settlement_bank_name}
                      onChange={(e) => setFormData({ ...formData, settlement_bank_name: e.target.value })}
                      required
                    >
                      <option value="">Select</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="GTBank">GTBank</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="First Bank">First Bank</option>
                      <option value="UBA">UBA</option>
                      <option value="Fidelity Bank">Fidelity Bank</option>
                      <option value="Ecobank">Ecobank</option>
                      <option value="Union Bank">Union Bank</option>
                      <option value="Sterling Bank">Sterling Bank</option>
                      <option value="Wema Bank">Wema Bank</option>
                      <option value="Opay">Opay</option>
                      <option value="Kuda">Kuda</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      Account Number
                    </Label>
                    <Input
                      id="account_number"
                      value={formData.settlement_account_number}
                      onChange={(e) => setFormData({ ...formData, settlement_account_number: e.target.value })}
                      placeholder="0123456789"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BadgePercent className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Platform Fee: 3%</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Bizzy charges 3% per transaction. Paystack charges 1.5% + ₦100. 
                    You receive instant settlement to your bank account on every sale.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-emerald-800">
                      I agree to the 3% platform fee and instant settlement terms
                    </span>
                  </label>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-shadow bg-emerald-600 hover:bg-emerald-700">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Create Account & Connect Bank
                </Button>
              </form>
            )}

            {step === "submitting" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm text-muted-foreground">Creating your account...</p>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center gap-4 py-6 animate-fade-in-scale">
                <div className="rounded-full bg-emerald-100 p-4 animate-pulse">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <ShieldCheck className="inline h-3 w-3 mr-1" />
          Secured by Paystack · Bank-grade encryption
        </p>
      </div>
    </div>
  )
}
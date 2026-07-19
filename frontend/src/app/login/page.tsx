"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sendOTP, verifyOTP } from "@/lib/api"
import { Store, Loader2, ArrowRight, CheckCircle, MessageSquare, Shield } from "lucide-react"

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

export default function LoginPage() {
  const { login } = useAuth()
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await sendOTP(phone)
      setStep("otp")
    } catch (err: any) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await verifyOTP(phone, otp)
      setStep("success")
      setTimeout(() => login(res.access_token), 800)
    } catch (err: any) {
      setError(err.message || "Invalid OTP")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Floating Background Shapes */}
      <FloatingShape delay={0} size={300} x="-5%" y="10%" color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" />
      <FloatingShape delay={1} size={200} x="70%" y="-5%" color="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" />
      <FloatingShape delay={2} size={150} x="80%" y="60%" color="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" />
      <FloatingShape delay={1.5} size={100} x="10%" y="70%" color="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBoNDBWMEgwVjQwWiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDQwaDQwVjBIMFY0MFoiIGZpbGw9IiNjY2MiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
            <div className="relative rounded-2xl bg-primary p-4 shadow-2xl shadow-primary/30">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-2xl shadow-black/5 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 animate-fade-in-scale">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {step === "phone" && "Welcome Back"}
              {step === "otp" && "Verify OTP"}
              {step === "success" && "Success!"}
            </CardTitle>
            <CardDescription>
              {step === "phone" && "Enter your WhatsApp number to login"}
              {step === "otp" && `Enter the 6-digit code sent to ${phone}`}
              {step === "success" && "Redirecting to dashboard..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`h-2 rounded-full transition-all duration-500 ${step !== "phone" ? "w-8 bg-primary" : "w-8 bg-primary"}`} />
              <div className={`h-2 rounded-full transition-all duration-500 ${step === "otp" || step === "success" ? "w-8 bg-primary" : "w-8 bg-muted"}`} />
              <div className={`h-2 rounded-full transition-all duration-500 ${step === "success" ? "w-8 bg-primary" : "w-8 bg-muted"}`} />
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            )}

            {step === "phone" && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">WhatsApp Number</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+2348012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/50"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Send OTP
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium">OTP Code</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="482910"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="pl-10 h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/50 text-center tracking-[0.5em] font-mono text-lg"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Verify & Login
                </Button>
                <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={() => setStep("phone")}>
                  Back to phone number
                </Button>
              </form>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center gap-4 py-4 animate-fade-in-scale">
                <div className="rounded-full bg-green-100 p-4 animate-pulse">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">Authentication successful</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-in stagger-2">
          Secured by Bizzy AI Engine · OTP Authentication
        </p>
      </div>
    </div>
  )
}

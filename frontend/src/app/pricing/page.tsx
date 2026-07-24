"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Check, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  MessageSquare, 
  Receipt, 
  Package, 
  BarChart3, 
  Mic, 
  Users, 
  Headphones, 
  Palette, 
  Code,
  ShieldCheck,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const tiers = [
  {
    name: "Starter",
    price: 2500,
    priceDollar: "~$1.50",
    description: "Perfect for solo sellers just getting started on WhatsApp.",
    icon: Zap,
    color: "from-emerald-500 to-teal-600",
    bgColor: "stat-card-revenue",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
    features: [
      { icon: MessageSquare, text: "Up to 200 customer conversations" },
      { icon: Receipt, text: "Bizzy Records (receipts)" },
      { icon: Package, text: "Basic catalog (20 products)" },
      { icon: TrendingUp, text: "Daily sales summary" },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Growth",
    price: 6000,
    priceDollar: "~$4",
    description: "For growing businesses ready to scale their operations.",
    icon: Sparkles,
    color: "from-blue-500 to-indigo-600",
    bgColor: "stat-card-products",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    features: [
      { icon: MessageSquare, text: "Unlimited conversations" },
      { icon: Package, text: "Full catalog (unlimited products)" },
      { icon: Receipt, text: "Bizzy Records + Watches + Talks" },
      { icon: BarChart3, text: "Analytics dashboard" },
      { icon: Mic, text: "Voice note support" },
      { icon: TrendingUp, text: "Bulk price editor" },
    ],
    cta: "Start Growing",
    popular: true,
  },
  {
    name: "Pro",
    price: 15000,
    priceDollar: "~$9",
    description: "Enterprise-grade power for established merchants.",
    icon: ShieldCheck,
    color: "from-purple-500 to-violet-600",
    bgColor: "stat-card-alert",
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    features: [
      { icon: Sparkles, text: "Everything in Growth" },
      { icon: Users, text: "Multiple staff numbers" },
      { icon: Headphones, text: "Priority support" },
      { icon: Palette, text: "Custom greeting & branding" },
      { icon: BarChart3, text: "Advanced analytics" },
      { icon: Code, text: "API access" },
    ],
    cta: "Go Pro",
    popular: false,
  },
]

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!started) return
    const duration = 1000
    const steps = 25
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

  return <span>₦{display.toLocaleString("en-NG")}</span>
}

export default function PricingPage() {
  const router = useRouter()
  const [hoveredTier, setHoveredTier] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Bizzy</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-muted-foreground hover:text-foreground"
              >
                Log in
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-gradient-to-t from-purple-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Power your WhatsApp
              <br />
              <span className="gradient-text">business for less</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Choose a plan that fits your business. No hidden fees, no surprises.
              Upgrade or downgrade anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier, index) => {
              const Icon = tier.icon
              const isHovered = hoveredTier === tier.name

              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  onMouseEnter={() => setHoveredTier(tier.name)}
                  onMouseLeave={() => setHoveredTier(null)}
                  className={`relative rounded-2xl border-2 p-6 sm:p-8 transition-all duration-300 ${
                    tier.popular
                      ? "border-primary/50 shadow-xl shadow-primary/5 scale-[1.02] md:scale-105"
                      : "border-border hover:border-primary/30 hover:shadow-lg"
                  } ${isHovered && !tier.popular ? "scale-[1.01] shadow-lg" : ""} ${
                    tier.bgColor
                  }`}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-md">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${tier.iconBg} mb-4`}>
                      <Icon className={`h-6 w-6 ${tier.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">
                        <AnimatedNumber value={tier.price} />
                      </span>
                      <span className="text-muted-foreground font-medium">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tier.priceDollar}</p>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => router.push("/login")}
                    className={`w-full mb-8 h-11 text-base font-semibold transition-all ${
                      tier.popular
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  {/* Features */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      What&apos;s included
                    </p>
                    {tier.features.map((feature) => {
                      const FeatureIcon = feature.icon
                      return (
                        <div key={feature.text} className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-full p-1 ${tier.iconBg}`}>
                            <Check className={`h-3 w-3 ${tier.iconColor}`} />
                          </div>
                          <div className="flex items-center gap-2">
                            <FeatureIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground leading-snug">
                              {feature.text}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust / FAQ teaser */}
      <section className="border-t border-border/50 bg-muted/30 py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to grow your business?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join thousands of Nigerian merchants using Bizzy to sell smarter on WhatsApp.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 h-12 px-8 text-base"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/login")}
                className="h-12 px-8 text-base"
              >
                Log in to Dashboard
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">Bizzy</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Bizzy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
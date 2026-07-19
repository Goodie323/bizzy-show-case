import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NotificationProvider } from "@/components/notifications/NotificationProvider"
import { NotificationToast } from "@/components/notifications/NotificationToast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Bizzy Admin",
  description: "AI-powered WhatsApp business dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          <NotificationToast />
        </body>
      </html>
    </NotificationProvider>
  )
}

import type { Metadata } from "next"
import type React from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { AuthProvider } from "@/hooks/useAuth"
import MiniAppReady from "./miniapp-ready"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
  preload: true,
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "Saku - Fast Payment",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  other: {
    "base:app_id": "6978230488e3bac59cf3da96",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`overflow-x-hidden ${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased overflow-x-hidden">
        <MiniAppReady />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

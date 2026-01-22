import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/context/AuthContext" // Pastikan path ini benar
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Saku - Fast Payment",
  description: "Transfer money with just a phone number. Fast, secure, and walletless.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  generator: "v0.app",
  icons: {
     icon: [
       { url: "/logo.png", sizes: "32x32", type: "image/png" },
       { url: "/logo.png", sizes: "192x192", type: "image/png" },
     ],
     apple: [
       { url: "/logo.png", sizes: "180x180", type: "image/png" },
     ],
   }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {/* Bungkus children dengan AuthProvider di sini */}
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
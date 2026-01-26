"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CallbackPage({ params }: { params: { orderId: string } }) {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home since callbacks are no longer used
    router.push("/home")
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import HomeHeader from "@/components/home/header"
import BalanceCardSection from "@/components/home/balance-card-section"
import QuickActions from "@/components/home/quick-actions"
import RecentTransactions from "@/components/home/recent-transactions"
import BottomNavigation from "@/components/home/bottom-navigation"
import TransferModal from "@/components/transfer/transfer-modal"
import PendingBillsSection from "@/components/home/pending-bills"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/get-started")
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <div className="animate-pulse text-black/50 font-medium text-lg text-center">
          <video
            className="w-50"
            src="/logo.webm"
            autoPlay
            muted
            loop
            playsInline
          />
          Loading Saku...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-dvh bg-background font-sans">
      <HomeHeader />

      <main className="max-w-lg mx-auto px-4 space-y-6 py-6 pb-28">
        <BalanceCardSection />
        <QuickActions />
        <PendingBillsSection />
        <RecentTransactions />
      </main>

      <BottomNavigation />

      {showTransferModal && (
        <TransferModal onClose={() => setShowTransferModal(false)} />
      )}
    </div>
  )
}

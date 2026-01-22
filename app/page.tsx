"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/context/AuthContext"
import HomeHeader from "@/components/home/header"
import BalanceCardSection from "@/components/home/balance-card-section"
import QuickActions from "@/components/home/quick-actions"
import RecentTransactions from "@/components/home/recent-transactions"
import BottomNavigation from "@/components/home/bottom-navigation"
import TransferModal from "@/components/transfer/transfer-modal"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthContext() 
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/get-started')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="animate-pulse text-[#7F8790] font-medium">Loading Saku...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <HomeHeader />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 space-y-6 py-6">
        {/* Balance Card */}
        <BalanceCardSection />

        {/* Tambahkan prop onTransferClick jika QuickActions membutuhkannya untuk buka modal */}
        <QuickActions />

        {/* Recent Transactions */}
        <RecentTransactions />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Transfer Modal */}
      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} />}
    </div>
  )
}
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

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth() 
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/get-started')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="animate-pulse text-[#7F8790] font-medium text-lg text-center">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading Saku...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <HomeHeader />

      <main className="max-w-lg mx-auto px-4 space-y-6 py-6">
        {/* Balance Card - Sekarang datanya sync dengan DB via useAuth */}
        <BalanceCardSection />

        {/* Action Buttons */}
        <QuickActions onTransferClick={() => setShowTransferModal(true)} />

        {/* Recent Transactions */}
        <RecentTransactions />
      </main>

      {/* Navigasi Bawah */}
      <BottomNavigation />

      {/* Modal Transfer */}
      {showTransferModal && (
        <TransferModal onClose={() => setShowTransferModal(false)} />
      )}
    </div>
  )
}
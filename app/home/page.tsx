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
import ReceiptModal from "@/components/home/receipt-modal"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/get-started")
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <video className="w-50" src="/logo.webm" autoPlay muted loop playsInline />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-dvh bg-white font-sans relative max-w-lg mx-auto">
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-primary via-primary/10 to-transparent pointer-events-none" />

      <HomeHeader />

      <main className="max-w-lg mx-auto px-4 space-y-6 py-2 relative z-10">
        <BalanceCardSection />
          
        <QuickActions />
        <PendingBillsSection />
        <RecentTransactions onTxSelect={setSelectedTx} />
      </main>

      {!selectedTx && <BottomNavigation />}

      {showTransferModal && (
        <TransferModal onClose={() => setShowTransferModal(false)} />
      )}

      {selectedTx && (
        <ReceiptModal selectedTx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  )
}
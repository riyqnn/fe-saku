"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import BalanceCard from "@/components/home/balance-card"
import SearchBar from "@/components/home/search-bar"
import RecentTransfers from "@/components/home/recent-transfer"
import PayButton from "@/components/home/pay-button"
import TransferModal from "@/components/transfer/transfer-modal"

export default function Home() {
  const router = useRouter()
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    const isOnboarded = localStorage.getItem('isOnboarded') === 'true'
    if (!isOnboarded) {
      router.push('/get-started')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary/5 to-transparent pt-4 px-4 pb-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-foreground">BayarDulu</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 space-y-6">
        {/* Balance Card */}
        <BalanceCard balance={1250000} />

        {/* Search Bar */}
        <SearchBar onPayClick={() => setShowTransferModal(true)} />

        {/* Recent Transfers */}
        <RecentTransfers />
      </main>

      {/* FAB */}
      <PayButton onClick={() => setShowTransferModal(true)} />

      {/* Transfer Modal */}
      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} />}
    </div>
  )
}

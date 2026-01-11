"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient" 
import BalanceCard from "@/components/home/balance-card"
import SearchBar from "@/components/home/search-bar"
import RecentTransfers from "@/components/home/recent-transfer"
import PayButton from "@/components/home/pay-button"
import TransferModal from "@/components/transfer/transfer-modal"

export default function Home() {
  const router = useRouter()
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/get-started')
      } else {
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="animate-pulse text-[#7F8790] font-medium">Loading Saku...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9EFE5] pb-20">
      <header className="pt-8 px-6 pb-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold text-[#000000]">Saku</h1> 
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 space-y-6">
        {/* Balance Card - Nantinya saldo ini kita ambil dari blockchain */}
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
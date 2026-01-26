"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useRegistry } from "@/hooks/useRegistry"
import { ethers } from "ethers"
import { getProvider } from "@/lib/blockchain"
import HomeHeader from "@/components/home/header"
import BalanceCardSection from "@/components/home/balance-card-section"
import QuickActions from "@/components/home/quick-actions"
import RecentTransactions from "@/components/home/recent-transactions"
import BottomNavigation from "@/components/home/bottom-navigation"
import TransferModal from "@/components/transfer/transfer-modal"
import PendingBillsSection from "@/components/home/pending-bills"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth() 
  const [showTransferModal, setShowTransferModal] = useState(false)
  
  const signer = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const pKey = localStorage.getItem('saku_private_key');
    if (!pKey) return null;
    try {
      return new ethers.Wallet(pKey, getProvider());
    } catch { return null; }
  }, []);

  const { withdrawAll, isLoading: isWithdrawing } = useRegistry(signer)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/get-started')
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="animate-pulse text-[#7F8790] font-medium text-lg text-center">
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
    <div className="min-h-screen bg-background animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <HomeHeader />

      <main className="max-w-lg mx-auto px-4 space-y-6 py-6">
        {/* Balance Card Section */}
        <BalanceCardSection />

        <PendingBillsSection />

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
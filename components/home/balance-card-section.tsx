"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"

export default function BalanceCardSection() {
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const { formattedBalance, refreshing } = useBalance(walletAddress)
  const [balanceVisible, setBalanceVisible] = useState(true)

  // Get wallet address from localStorage (set during OTP verification)
  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem('walletAddress')
      setWalletAddress(storedWallet)
      console.log('✅ [BalanceCardSection] Wallet loaded from localStorage:', storedWallet)
    } catch (err) {
      console.error("Failed to get wallet address from localStorage:", err)
      setWalletAddress(null)
    } finally {
      setIsLoadingWallet(false)
    }
  }, [])

  const displayBalance = !isLoadingWallet ? formattedBalance : "..."

  return (
    <div className="pt-2 sm:pt-3 animate-in slide-in-from-top-4 duration-700">
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
        {/* Glass background layer */}
        <div className="absolute inset-0 glass-effect" />

        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 dark:from-primary/30 dark:via-secondary/20 dark:to-accent/20" />

        {/* Content */}
        <div className="relative px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Total Balance</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                {balanceVisible ? displayBalance : "••••••"}
                {(refreshing || isLoadingWallet) && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
              </h2>
            </div>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
            >
              {balanceVisible ? (
                <Eye className="w-5 h-5 sm:w-5 sm:h-5 text-muted-foreground" />
              ) : (
                <EyeOff className="w-5 h-5 sm:w-5 sm:h-5 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10 dark:border-white/5">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
              <p className="font-mono text-xs font-medium text-foreground truncate">
                {isLoadingWallet ? "Loading..." : walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not created'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Phone</p>
              <p className="font-medium text-foreground text-xs">
                {user?.phone ? user.phone.slice(-4) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

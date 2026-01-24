"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2, Copy, CheckCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"

export default function BalanceCardSection() {
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(true)
  const { formattedBalance, refreshing } = useBalance(walletAddress)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [copied, setCopied] = useState(false)

  // Get wallet address from localStorage (set during OTP verification)
  useEffect(() => {
    try {
      if (user?.id) {
        setWalletAddress(user?.wallet_address);
        setPhoneNumber(user?.phone_number);
        setFullName(user?.full_name);
      }
    } catch (err) {
      console.error("Failed to get wallet address from localStorage:", err)
      setWalletAddress(null)
    } finally {
      setIsLoadingWallet(false)
    }
  }, [])

  const displayBalance = !isLoadingWallet ? formattedBalance : "..."

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 animate-fade-in-up">
      <div className="relative rounded-3xl sm:rounded-4xl overflow-hidden group">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary opacity-100 dark:opacity-80" />

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-sm" />

        {/* Animated gradient accent */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />

        {/* Content */}
        <div className="relative px-6 sm:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
          {/* Top Section - Balance */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium text-white/80">Total Balance</p>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-4xl sm:text-5xl font-bold text-white flex items-center gap-3">
                {balanceVisible ? displayBalance : "••••••"}
                {(refreshing || isLoadingWallet) && (
                  <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white/80 flex-shrink-0" />
                )}
              </h2>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-2.5 sm:p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
              >
                {balanceVisible ? (
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
                ) : (
                  <EyeOff className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/20" />

          {/* Bottom Section - Wallet Info */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-medium text-white/80">Wallet Address</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs sm:text-sm font-semibold text-white truncate">
                  {isLoadingWallet ? "Loading..." : walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not created'}
                </p>
                {!isLoadingWallet && walletAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/80 hover:text-white" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-medium text-white/80">Phone</p>
              <p className="font-semibold text-sm sm:text-base text-white">
                +{phoneNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Balance Status */}
      <div className="flex items-center justify-between mt-4 px-2">
        <span className="text-xs sm:text-sm text-muted-foreground">On-Chain Balance</span>
        <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary font-semibold">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>
    </div>
  )
}

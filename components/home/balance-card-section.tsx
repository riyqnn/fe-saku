"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2, Copy, CheckCircle, Sparkles, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"

export default function BalanceCardSection() {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const walletAddress = user?.wallet_address || null
  const { formattedBalance, refreshing } = useBalance(walletAddress)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [copied, setCopied] = useState(false)

  const displayBalance = !isLoadingAuth ? formattedBalance : "..."

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 animate-fade-in-up font-sans">
      <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 overflow-hidden shadow-xl shadow-primary/20 group">
        {/* Animated gradient accent */}
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Wallet size={80} className="text-amber-900" />
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          {/* Top Section - Balance */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-900/60" />
              <p className="text-[10px] font-bold text-amber-900/60 tracking-[0.2em]">Saku Wallet Balance</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-4xl font-bold text-black/85 tracking-tighter flex items-center gap-3">
                {balanceVisible ? displayBalance : "••••••"}
                {(refreshing || isLoadingAuth) && (
                  <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-black/40 flex-shrink-0" />
                )}
              </h2>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-2.5 sm:p-3 hover:bg-black/5 rounded-full transition-colors flex-shrink-0"
              >
                {balanceVisible ? (
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-black/40" />
                ) : (
                  <EyeOff className="w-5 h-5 sm:w-6 sm:h-6 text-black/40" />
                )}
              </button>
            </div>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-amber-900/60">
              <span className="px-2 py-1 bg-black/5 rounded-lg">IDRX Protocol</span>
              <span>Active</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-black/5" />

          {/* Bottom Section - Wallet Info */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-semibold text-amber-900/60">Wallet Address</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs sm:text-sm font-semibold text-black/85 truncate">
                  {isLoadingAuth ? "Loading..." : walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not created'}
                </p>
                {!isLoadingAuth && walletAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-black/5 rounded-lg transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-amber-700" />
                    ) : (
                      <Copy className="w-4 h-4 text-black/40 hover:text-black/85" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-semibold text-amber-900/60">Phone</p>
              <p className="font-semibold text-sm sm:text-base text-black/85">
                {user?.phone_number ? user.phone_number.slice(-4) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Balance Status */}
      <div className="flex items-center justify-between mt-4 px-2">
        <span className="text-xs sm:text-sm text-black/50">On-Chain Balance</span>
        <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary font-semibold">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Copy, CheckCircle, Wallet } from "lucide-react" 
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"

export default function BalanceCardSection() {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const walletAddress = user?.wallet_address || null
  const { formattedBalance, refreshing } = useBalance(walletAddress) 
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [copied, setCopied] = useState(false)

  const displayBalance = !isLoadingAuth ? formattedBalance : "...";

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 animate-fade-in-up font-sans">
      <div className="relative p-6 sm:p-8 rounded-[2rem] bg-white border border-gray
      -200 shadow-[0_20px_50px_rgba(240,163,83,0.1)] overflow-hidden group">
        
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors duration-700" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex justify-between items-start">
            <div className="space-y-1">
               <h3 className="text-[10px] font-black tracking-[0.3em] text-secondary">Saku Platinum</h3>
               <div className="w-10 h-8 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-2 gap-px opacity-20">
                    <div className="border-r border-b border-black"></div>
                    <div className="border-b border-black"></div>
                  </div>
               </div>
            </div>
            <div className="text-right p-4">
              <img src="/logo.png" alt="Saku Logo" className="w-10 h-auto opacity-90" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-black/30 tracking-widest">Current Balance</p>
            <div className="flex items-center justify-between">
              <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tighter italic flex items-center gap-3">
                {balanceVisible ? `$ ${displayBalance}` : "$ ••••••"}
                {(refreshing || isLoadingAuth) && (
                  <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                )}
              </h2>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-2 hover:bg-secondary/10 rounded-full transition-colors"
              >
                {balanceVisible ? (
                  <Eye className="w-5 h-5 text-black/20" />
                ) : (
                  <EyeOff className="w-5 h-5 text-black/20" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-end pt-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-[9px] font-bold text-black/20 tracking-widest">Wallet Address</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-bold text-black/70 tracking-[0.15em]">
                  {isLoadingAuth ? "•••• •••• ••••" : walletAddress ? `${walletAddress.slice(0, 4)} ${walletAddress.slice(4, 8)} •••• ${walletAddress.slice(-4)}`.toUpperCase() : 'NO WALLET'}
                </p>
                {!isLoadingAuth && walletAddress && (
                  <button onClick={handleCopyAddress} className="transition-transform active:scale-90">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-black/20" />}
                  </button>
                )}
              </div>
            </div>

            <div className="text-right pl-4">
               <p className="text-[9px] font-bold text-black/20 tracking-widest mb-1">Holder</p>
               <p className="text-sm font-black italic text-black/80 truncate max-w-[120px]">
                 {user?.full_name || 'Saku User'}
               </p>
            </div>
          </div>

        </div>
      </div>

      
    </div>
  )
}
"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Copy, CheckCircle } from "lucide-react" 
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"

export default function BalanceCardSection() {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const walletAddress = user?.wallet_address || null
  const { balance, refreshing } = useBalance(walletAddress) 
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [copied, setCopied] = useState(false)

  const displayBalance = !isLoadingAuth 
    ? (parseFloat(balance?.toString() || "0") || 0).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) 
    : "...";

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="pt-2 sm:pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="relative aspect-[1.6/1] w-full rounded-[2.5rem] p-8 text-white overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-amber-500/20 border border-white/10 group">
        
        {/* Background Base */}
        <div className="absolute inset-0 bg-[#0A0A0A]" />

        {/* Glow Effects */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#f59e0b20,transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/20 via-transparent to-orange-500/10 animate-pulse" />
        </div>

        {/* Noise and Shine Effect */}
        <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-700">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-[1500ms] ease-in-out" />
        </div>

        {/* Decorative Circles */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full" />

        <div className="relative h-full flex flex-col justify-between z-10">
          
          <div className="flex justify-between items-start">
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                <div className="p-1 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                  <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                </div>
                <span className="font-bold tracking-tight text-lg bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                  Saku.
                </span>
              </div>
               
               <div className="w-11 h-8 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-md relative shadow-[0_0_15px_rgba(251,191,36,0.3)] overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-2 gap-px opacity-30">
                    <div className="border-r border-b border-black/50" />
                    <div className="border-b border-black/50" />
                    <div className="border-r border-black/50" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
               </div>
            </div>
            
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-[9px] font-bold tracking-[0.2em] text-amber-500 uppercase">Platinum Member</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-amber-500 tracking-[0.2em] uppercase">Current Balance</p>
            <div className="flex items-center justify-between">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter flex items-center gap-3 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                {balanceVisible ? `$ ${displayBalance}` : "$ ••••••"}
                {(refreshing || isLoadingAuth) && (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                )}
              </h2>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
              >
                {balanceVisible ? (
                  <Eye className="w-5 h-5 text-white/40" />
                ) : (
                  <EyeOff className="w-5 h-5 text-white/40" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-[10px] text-white/30 font-medium tracking-[0.15em] uppercase">Wallet Address</p>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 backdrop-blur-md">
                  <p className="font-mono text-sm tracking-[0.1em] text-amber-100/90">
                    {isLoadingAuth ? "•••• •••• ••••" : walletAddress ? `${walletAddress.slice(0, 4)} •••• •••• ${walletAddress.slice(-4)}` : 'NO WALLET'}
                  </p>
                </div>
                {!isLoadingAuth && walletAddress && (
                  <button onClick={handleCopyAddress} className="p-2 hover:bg-white/5 rounded-lg transition-all active:scale-90">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/20" />}
                  </button>
                )}
              </div>
            </div>

            <div className="text-right pl-4">
               <p className="text-[10px] text-white/30 font-medium tracking-[0.15em] uppercase mb-1">Holder</p>
               <p className="text-sm font-semibold truncate max-w-[120px] text-white/90">
                 {user?.full_name || 'Saku User'}
               </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
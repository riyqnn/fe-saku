"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Send, 
  QrCode, 
  Loader2, 
  Gift, 
  Users2 
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

const quickActions = [
  {
    id: "topup",
    label: "Top Up",
    icon: ArrowDownLeft,
    color: "bg-orange-100 text-[#F0A353]",
    href: "/topup",
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: Send,
    color: "bg-blue-100 text-blue-600",
    href: "/transfer",
  },
  {
    id: "packet",
    label: "Packet",
    icon: Gift,
    color: "bg-red-100 text-red-600",
    href: "/packet/create",
  },
  {
    id: "split-bill",
    label: "Split Bill",
    icon: Users2,
    color: "bg-purple-100 text-purple-600",
    href: "/split-bill",
  },
  {
    id: "withdraw",
    label: "Withdraw",
    icon: ArrowUpRight,
    color: "bg-slate-200 text-slate-600",
    href: "/withdraw",
  },
]

export default function QuickActions() {
  const router = useRouter()
  const { user, isLoading: isCheckingWallet } = useAuth()
  const walletAddress = user?.wallet_address || null
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (actionId: string, href: string) => {
    try {
      setError(null)
      setLoading(actionId)
      if (!walletAddress) {
        setError("Wallet setup required")
        setLoading(null)
        return
      }
      router.push(href)
    } catch (err) {
      setError("System error")
      setLoading(null)
    }
  }

  return (
    <div className="animate-fade-in-up font-sans" style={{ animationDelay: "100ms" }}>
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-xl p-6 shadow-[0_15px_35px_rgba(240,163,83,0.08)] relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-black/40 ">Main Services</h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/5 to-transparent ml-4" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50/80 border border-red-100 backdrop-blur-sm">
            <p className="text-[10px] font-black text-red-600  tracking-wider text-center">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-y-7 gap-x-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon
            const isLoading = loading === action.id
            const isDisabled = !walletAddress || isLoading || isCheckingWallet

            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id, action.href)}
                disabled={isDisabled}
                className="flex flex-col items-center group transition-all active:scale-95 disabled:opacity-40"
              >
                <div
                  className={`
                    w-13 h-13 sm:w-15 sm:h-15 rounded-[1.4rem] ${action.color} 
                    flex items-center justify-center transition-all duration-300 
                    border-2 border-white shadow-sm
                    group-hover:shadow-md group-hover:-translate-y-1 group-hover:rotate-3
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                  )}
                </div>
                
                <span className="text-[9px] sm:text-[10px] font-black text-black/60 mt-3 text-center transition-colors group-hover:text-black">
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
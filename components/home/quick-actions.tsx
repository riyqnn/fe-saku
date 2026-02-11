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
    color: "bg-amber-50 text-amber-600",
    href: "/topup",
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: Send,
    color: "bg-blue-50 text-blue-600",
    href: "/transfer",
  },
  {
    id: "pay",
    label: "Pay",
    icon: QrCode,
    color: "bg-emerald-50 text-emerald-600",
    href: "/pay",
  },
  {
    id: "packet",
    label: "Packet",
    icon: Gift,
    color: "bg-red-50 text-red-600",
    href: "/packet/create", // Sesuaikan dengan route Dana Kaget kamu
  },
  {
    id: "split-bill",
    label: "Split Bill",
    icon: Users2,
    color: "bg-purple-50 text-purple-600",
    href: "/split-bill",
  },
  {
    id: "withdraw",
    label: "Withdraw",
    icon: ArrowUpRight,
    color: "bg-slate-100 text-slate-600",
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
        setError("Wallet belum siap. Mohon selesaikan setup.")
        setLoading(null)
        return
      }

      router.push(href)
    } catch (err) {
      setError("Terjadi kesalahan sistem")
      setLoading(null)
    }
  }

  return (
    <div className="animate-fade-in-up font-sans px-1" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-black/40">Layanan Utama</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-bold text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-y-6 gap-x-2">
        {quickActions.map((action, idx) => {
          const Icon = action.icon
          const isLoading = loading === action.id
          const isDisabled = !walletAddress || isLoading || isCheckingWallet

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id, action.href)}
              disabled={isDisabled}
              className="flex flex-col items-center group transition-all active:scale-90 disabled:opacity-50"
              style={{ 
                animation: `slideInUp 0.4s ease-out forwards ${idx * 50}ms`,
                opacity: 0 
              }}
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${action.color} flex items-center justify-center transition-all duration-200 group-hover:shadow-md border border-black/[0.03]`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-black/70 mt-2.5 tracking-tight text-center">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
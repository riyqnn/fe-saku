 "use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, ArrowUpRight, Send, QrCode, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

const quickActions = [
  {
    id: "deposit",
    label: "Deposit",
    icon: ArrowDownLeft,
    color: "from-primary to-secondary",
    href: "/deposit",
    description: "Add funds to your wallet",
  },
  {
    id: "withdraw",
    label: "Withdraw",
    icon: ArrowUpRight,
    color: "from-accent to-primary",
    href: "/withdraw",
    description: "Withdraw to bank account",
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: Send,
    color: "from-secondary to-accent",
    href: "/transfer",
    description: "Send to another wallet",
  },
  {
    id: "pay",
    label: "Pay",
    icon: QrCode,
    color: "from-accent to-secondary",
    href: "/pay",
    description: "Pay with QR code",
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

      // Check if wallet is created
      if (!walletAddress) {
        setError("Wallet not created yet. Please complete setup.")
        setLoading(null)
        return
      }

      // Navigate to the corresponding page
      router.push(href)
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      setLoading(null)
    }
  }

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Quick Actions</p>
        <div className="h-px flex-1 ml-3 bg-gradient-to-r from-border to-transparent" />
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 rounded-2xl bg-destructive/10 dark:bg-destructive/5 border border-destructive/20 animate-fade-in-up">
          <p className="text-xs sm:text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map((action, idx) => {
          const Icon = action.icon
          const isLoading = loading === action.id
          const isDisabled = !walletAddress || isLoading || isCheckingWallet

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id, action.href)}
              disabled={isDisabled}
              className="group animate-fade-in-scale w-full disabled:opacity-50"
              style={{ animationDelay: `${100 + idx * 50}ms` }}
              title={action.description}
            >
              <div
                className={`w-full aspect-square rounded-2xl sm:rounded-3xl bg-gradient-to-br ${action.color} p-3 sm:p-4 flex items-center justify-center shadow-lg hover:shadow-2xl group-hover:scale-105 group-active:scale-95 transition-all duration-200 ${
                  isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-spin" />
                ) : (
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:scale-110 transition-transform" />
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground mt-2 sm:mt-2.5 text-center">{action.label}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
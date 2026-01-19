 "use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, ArrowUpRight, Send, QrCode, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import { hashPhoneNumber } from "@/utils/phoneHash"

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
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)

  // Fetch wallet address from database
  useEffect(() => {
    const fetchWalletAddress = async () => {
      try {
        if (!user?.phone) {
          setIsCheckingWallet(false)
          return
        }

        setIsCheckingWallet(true)
        const phoneHash = hashPhoneNumber(user.phone)

        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("phone_hash", phoneHash)
          .single()

        setWalletAddress(profile?.wallet_address || null)
      } catch (err) {
        console.error("Error fetching wallet:", err)
        setWalletAddress(null)
      } finally {
        setIsCheckingWallet(false)
      }
    }

    fetchWalletAddress()
  }, [user?.phone])

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
    <div className="animate-in slide-in-from-bottom-4 duration-700 delay-100">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</p>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
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
              className="group animate-in fade-in duration-500 w-full disabled:opacity-50"
              style={{ animationDelay: `${100 + idx * 50}ms` }}
              title={action.description}
            >
              <div
                className={`w-full aspect-square rounded-xl sm:rounded-2xl bg-gradient-to-br ${action.color} p-2 sm:p-3 flex items-center justify-center shadow-md hover:shadow-lg group-active:scale-95 transition-all duration-200 ${
                  isDisabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                ) : (
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </div>
              <p className="text-xs font-medium text-foreground mt-1 sm:mt-2 text-center">{action.label}</p>
            </button>
          )
        })}
      </div>
    </div>
          )
        }
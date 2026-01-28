"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, Wallet, CheckCircle, Loader2, Coins } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import Header from "@/components/layout/Header"

const IDRX_TOKEN_ADDRESS = "0x9c33242D93Bc4BCA866dFcB36FEeF81482383A56"

export default function TopupPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const walletAddress = user?.wallet_address || null

  const { formattedBalance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance(walletAddress)

  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleTopup = async () => {
    try {
      if (!walletAddress) {
        throw new Error("Wallet not found. Please complete setup.")
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Please enter a valid amount")
      }

      const numAmount = parseFloat(amount)

      setError(null)
      setLoading(true)

      // Call faucet API to mint tokens
      const response = await fetch('/api/topup/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          amount: numAmount,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to top up'

        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      setTxHash(data.txHash)
      setSuccess(true)

      // Refetch balance after successful top up
      setTimeout(() => {
        refetchBalance()
      }, 2000)

    } catch (err: any) {
      console.error('Top up error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/home")
  }

  const handleDone = () => {
    router.push("/home")
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans overflow-hidden">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in duration-500 border border-primary/20">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold italic text-black/85">Success!</h1>
          <p className="text-black/50 font-medium">
            You have successfully received {Number(amount).toLocaleString()} IDRX
          </p>

          {txHash && (
            <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
              <p className="text-xs font-semibold text-black/40 uppercase tracking-wider">
                Transaction Hash
              </p>
              <p className="text-sm font-mono text-black/85 break-all">
                {txHash}
              </p>
            </div>
          )}

          <button
            onClick={handleDone}
            className="w-full py-4 rounded-2xl bg-primary text-black font-semibold shadow-lg shadow-primary/30 active:scale-95 transition-all"
          >
            Back Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="max-w-lg mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <Header />

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {!walletAddress ? (
            <div className="p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 space-y-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-yellow-700">
                    Wallet Not Created
                  </p>
                  <p className="text-xs text-yellow-600 leading-relaxed">
                    Please complete your wallet setup first.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary via-amber-200 to-primary/80 border border-primary/20 space-y-2 shadow-xl shadow-primary/20">
                <p className="text-sm font-semibold text-amber-900/60">
                  Your Wallet Balance
                </p>
                {balanceLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-black/40" />
                    <p className="text-2xl font-bold text-black/85">Loading...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl sm:text-4xl font-bold text-black/85">
                      {formattedBalance}
                    </p>
                    <p className="text-xs text-amber-900/60 mt-1">
                      Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  </>
                )}
              </div>

              {/* Info Card */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-start gap-3">
                  <Coins className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-900">
                      Instant Top Up
                    </p>
                    <p className="text-xs text-black/50 leading-relaxed">
                      Enter the amount you need and receive IDRX tokens instantly. Tokens will be sent directly to your wallet address.
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-black/85">
                  Amount (IDRX)
                </label>
                <div className="space-y-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-4 rounded-2xl bg-muted/50 border-2 border-border text-black/85 text-lg font-semibold placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    disabled={loading}
                  />

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setAmount("100000")}
                      className="p-3 rounded-xl bg-primary/20 text-amber-900 font-semibold hover:bg-primary/30 transition-colors active:scale-95"
                      disabled={loading}
                    >
                      100K
                    </button>
                    <button
                      onClick={() => setAmount("500000")}
                      className="p-3 rounded-xl bg-primary/20 text-amber-900 font-semibold hover:bg-primary/30 transition-colors active:scale-95"
                      disabled={loading}
                    >
                      500K
                    </button>
                    <button
                      onClick={() => setAmount("1000000")}
                      className="p-3 rounded-xl bg-primary/20 text-amber-900 font-semibold hover:bg-primary/30 transition-colors active:scale-95"
                      disabled={loading}
                    >
                      1M
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleTopup}
                  disabled={!amount || loading || parseFloat(amount) <= 0}
                  className="w-full py-4 px-6 rounded-2xl bg-black text-white font-semibold text-lg shadow-xl shadow-black/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      Top Up {amount ? Number(amount).toLocaleString() : '0'} IDRX
                    </>
                  )}
                </button>

                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-2xl bg-muted/50 text-black/85 font-semibold text-lg hover:bg-muted transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, Wallet, CheckCircle, Loader2, Coins } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"

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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card dark:bg-card rounded-3xl p-8 shadow-2xl border border-border">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Top Up Successful!
              </h1>
              <p className="text-muted-foreground">
                You have successfully received {Number(amount).toLocaleString()} IDRX
              </p>
            </div>

            {txHash && (
              <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Transaction Hash
                </p>
                <p className="text-sm font-mono text-foreground break-all">
                  {txHash}
                </p>
              </div>
            )}

            <button
              onClick={handleDone}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-lg mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between bg-card/80 backdrop-blur-lg border-b border-border">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            disabled={loading}
          >
            <ArrowDownLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Top Up IDRX
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {!walletAddress ? (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 space-y-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-6 h-6 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                    Wallet Not Created
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 leading-relaxed">
                    Please complete your wallet setup first.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  Your Wallet Balance
                </p>
                {balanceLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-2xl font-bold text-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl sm:text-4xl font-bold text-foreground">
                      {formattedBalance} IDRX
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  </>
                )}
              </div>

              {/* Info Card */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-start gap-3">
                  <Coins className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">
                      Instant Top Up
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter the amount you need and receive IDRX tokens instantly. Tokens will be sent directly to your wallet address.
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                  Amount (IDRX)
                </label>
                <div className="space-y-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-4 rounded-2xl bg-card dark:bg-card border-2 border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    disabled={loading}
                  />

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setAmount("100000")}
                      className="p-3 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors"
                      disabled={loading}
                    >
                      100K
                    </button>
                    <button
                      onClick={() => setAmount("500000")}
                      className="p-3 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors"
                      disabled={loading}
                    >
                      500K
                    </button>
                    <button
                      onClick={() => setAmount("1000000")}
                      className="p-3 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors"
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
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
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
                  className="w-full py-4 px-6 rounded-2xl bg-muted text-foreground font-semibold text-lg hover:bg-muted/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

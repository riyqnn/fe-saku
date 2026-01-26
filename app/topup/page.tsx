"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, Wallet, CheckCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { useMidtransTopup, useTopupStatus } from "@/hooks/useMidtransTopup"

type PaymentMethod = 'gopay' | 'ovo' | 'dana' | null

const paymentMethods = [
  { id: 'gopay', name: 'GoPay', icon: '💰', color: 'from-blue-500 to-blue-600', description: 'Pay with GoPay e-wallet' },
  { id: 'ovo', name: 'OVO', icon: '💜', color: 'from-purple-500 to-purple-600', description: 'Pay with OVO e-wallet' },
  { id: 'dana', name: 'DANA', icon: '🔵', color: 'from-cyan-500 to-cyan-600', description: 'Pay with DANA e-wallet' },
] as const

export default function TopupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const walletAddress = user?.wallet_address || null

  const { formattedBalance, refetch: refetchBalance } = useBalance(walletAddress)
  const { createTopup, loading: isCreating } = useMidtransTopup()
  const { checkStatus, loading: isChecking } = useTopupStatus()

  const [amount, setAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [orderId, setOrderId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleTopup = async () => {
    try {
      if (!user?.phone_number) {
        throw new Error("User not authenticated")
      }

      if (!walletAddress) {
        throw new Error("Wallet not found. Please complete setup.")
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Please enter a valid amount")
      }

      if (!selectedMethod) {
        throw new Error("Please select a payment method")
      }

      setError(null)
      setIsRedirecting(true)

      const result = await createTopup({ amount, paymentMethod: selectedMethod })

      if (result.success && result.redirectUrl) {
        setOrderId(result.orderId || "")
        // Redirect to Midtrans payment page
        window.location.href = result.redirectUrl
      } else {
        throw new Error(result.error || "Failed to create topup")
      }
    } catch (err: any) {
      setError(err.message)
      setIsRedirecting(false)
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
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card dark:bg-card rounded-3xl p-8 shadow-2xl animate-fade-in-up">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Top Up Successful!</h1>
              <p className="text-muted-foreground">You have successfully topped up {Number(amount).toLocaleString()} IDRX</p>
            </div>

            {txHash && (
              <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Hash</p>
                <p className="text-sm font-mono text-foreground break-all">{txHash}</p>
              </div>
            )}

            <button
              onClick={handleDone}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="max-w-lg mx-auto min-h-screen bg-background dark:bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-border">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <ArrowDownLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Top Up</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {!walletAddress ? (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 space-y-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-6 h-6 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-yellow-500 dark:text-yellow-400">Wallet Not Created</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Please complete your wallet setup first.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Your Wallet Balance</p>
                <p className="text-3xl sm:text-4xl font-bold text-foreground">{formattedBalance} IDRX</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>

              {/* Info Card */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">How Top Up Works</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select your preferred payment method (GoPay, OVO, or DANA), enter the amount, and complete the payment. Your IDRX will be added to your wallet after confirmation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Payment Method</label>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                      disabled={isCreating || isRedirecting}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        selectedMethod === method.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      } ${isCreating || isRedirecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center text-2xl`}>
                          {method.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedMethod === method.id ? 'border-primary bg-primary' : 'border-border'
                        }`}>
                          {selectedMethod === method.id && (
                            <div className="w-3 h-3 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Amount (IDRX)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isCreating || isRedirecting}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                    <button
                      onClick={() => setAmount("100000")}
                      className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                      disabled={isCreating || isRedirecting}
                    >
                      100K
                    </button>
                    <button
                      onClick={() => setAmount("500000")}
                      className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                      disabled={isCreating || isRedirecting}
                    >
                      500K
                    </button>
                    <button
                      onClick={() => setAmount("1000000")}
                      className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                      disabled={isCreating || isRedirecting}
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

              {/* Action Button */}
              <div className="space-y-3">
                <button
                  onClick={handleTopup}
                  disabled={!amount || !selectedMethod || isCreating || isRedirecting || parseFloat(amount) <= 0}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  {isRedirecting ? (
                    <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Redirecting to payment...</>
                  ) : isCreating ? (
                    <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Creating payment...</>
                  ) : (
                    `Top Up ${amount} IDRX`
                  )}
                </button>

                <button
                  onClick={handleBack}
                  disabled={isCreating || isRedirecting}
                  className="w-full py-4 px-6 rounded-2xl bg-muted/50 text-foreground font-semibold text-lg hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

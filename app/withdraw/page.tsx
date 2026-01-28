"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Wallet, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuWithdraw } from "@/hooks/useSakuWithdraw"
import { useBalance } from "@/hooks/useBalance"
import { fromTokenAmount } from "@/lib/blockchain"
import { IDRX_DECIMALS } from "@/lib/config"
import Header from "@/components/layout/Header"

export default function WithdrawPage() {
  const router = useRouter()
  const { user } = useAuth()
  const walletAddress = user?.wallet_address || null
  const { withdraw, loading } = useSakuWithdraw()
  const { balance, formattedBalance, refetch: refetchBalance } = useBalance(walletAddress)

  const [amount, setAmount] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [withdrawAllFlag, setWithdrawAllFlag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [withdrawResult, setWithdrawResult] = useState<{ amount: string; fee: string; amountAfterFee: string } | null>(null)

  // Calculate estimated fee (1%) for display
  const estimatedFee = amount && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) * 0.01).toFixed(6)
    : "0"
  const estimatedAmountAfterFee = amount && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) - parseFloat(estimatedFee)).toFixed(6)
    : "0"

  const handleWithdraw = async () => {
    try {
      setError(null)

      if (!user?.phone_number) {
        throw new Error("User not authenticated")
      }

      if (!toAddress) {
        throw new Error("Please enter a destination address")
      }

      if (!amount && !withdrawAllFlag) {
        throw new Error("Please enter an amount or select withdraw all")
      }

      const result = await withdraw({
        toAddress,
        amount: withdrawAllFlag ? undefined : amount,
        withdrawAll: withdrawAllFlag || false,
      })

      if (result.success) {
        setTxHash(result.transactionHash || null)
        setWithdrawResult({
          amount: result.amount || "0",
          fee: result.fee || "0",
          amountAfterFee: result.amountAfterFee || "0",
        })
        setSuccess(true)

        // Refresh balance
        setTimeout(() => {
          refetchBalance()
        }, 2000)
      } else {
        throw new Error(result.error || "Withdrawal failed")
      }
    } catch (err: any) {
      setError(err.message || "Withdrawal failed")
    }
  }

  const handleBack = () => {
    router.push("/home")
  }

  const handleDone = () => {
    router.push("/home")
  }

  const handleMax = () => {
    setWithdrawAllFlag(true)
    setAmount("Max")
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background font-sans flex items-center justify-center p-6 overflow-hidden">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in duration-500 border border-primary/20">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold italic text-black/85">Success!</h1>
          <p className="text-black/50 font-medium">
            {withdrawAllFlag
              ? 'All funds have been withdrawn successfully.'
              : withdrawResult
                ? `${Number(withdrawResult.amountAfterFee).toLocaleString()} IDRX withdrawn`
                : `${Number(estimatedAmountAfterFee).toLocaleString()} IDRX withdrawn`
            }
          </p>

          {txHash && (
            <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
              <p className="text-xs font-semibold text-black/40 uppercase tracking-wider">Transaction Hash</p>
              <p className="text-sm font-mono text-black/85 break-all">{txHash}</p>
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
      <div className="max-w-lg mx-auto min-h-screen bg-background flex flex-col">
        {/* Header */}
        <Header />

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Balance Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-primary via-amber-200 to-primary/80 border border-primary/20 space-y-2 shadow-xl shadow-primary/20">
            <p className="text-sm font-semibold text-amber-900/60">Available Balance</p>
            <p className="text-3xl sm:text-4xl font-bold text-black/85">{formattedBalance}</p>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-2">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-orange-500">Withdrawal Fee</p>
                <p className="text-xs text-black/50 leading-relaxed">
                  A 1% fee applies to all withdrawals. This fee helps maintain the network and services.
                </p>
              </div>
            </div>
          </div>

          {/* Destination Address */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-black/85">Destination Address</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-black/85 text-sm font-mono placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={loading}
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-black/85">Amount (IDRX)</label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setWithdrawAllFlag(false)
                }}
                placeholder="Enter amount"
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-black/85 text-lg font-semibold placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={loading || withdrawAllFlag}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button
                  onClick={handleMax}
                  className="px-3 py-1 rounded-lg bg-primary/20 text-amber-900 text-xs font-semibold hover:bg-primary/30 transition-colors"
                  disabled={loading}
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          {amount && !withdrawAllFlag && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/50">Amount</span>
                <span className="text-sm font-semibold text-black/85">{Number(amount).toLocaleString()} IDRX</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/50">Fee (1%)</span>
                <span className="text-sm font-semibold text-orange-500">
                  -{Number(estimatedFee).toLocaleString()} IDRX
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-black/85">You'll Receive</span>
                <span className="text-lg font-bold text-green-500">
                  {Number(estimatedAmountAfterFee).toLocaleString()} IDRX
                </span>
              </div>
            </div>
          )}

          {withdrawAllFlag && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/50">Total Balance</span>
                <span className="text-sm font-semibold text-black/85">{formattedBalance}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/50">Est. Fee (1%)</span>
                <span className="text-sm font-semibold text-orange-500">
                  ~{(parseFloat(formattedBalance) * 0.01).toFixed(6)} IDRX
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleWithdraw}
              disabled={
                loading ||
                !toAddress ||
                (!amount && !withdrawAllFlag)
              }
              className="w-full py-4 px-6 rounded-2xl bg-black text-white font-semibold text-lg shadow-xl shadow-black/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? 'Withdrawing...' : `Withdraw ${withdrawAllFlag ? 'All' : amount} IDRX`}
            </button>

            <button
              onClick={handleBack}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-muted/50 text-black/85 font-semibold text-lg hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
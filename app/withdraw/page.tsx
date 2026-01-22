"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Wallet, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useDepositWithdraw } from "@/hooks/useDepositWithdraw"
import { useBalance } from "@/hooks/useBalance"
import { toTokenAmount, fromTokenAmount } from "@/lib/blockchain"
import { IDRX_DECIMALS } from "@/lib/config"

export default function WithdrawPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { signer, connect, address } = useWallet()
  const { withdraw, withdrawAll, isWithdrawing, calculateWithdrawFee, calculateAmountAfterFee } = useDepositWithdraw(signer)
  const { balance, formattedBalance, refetch: refetchBalance } = useBalance(address)

  const [amount, setAmount] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [withdrawAllFlag, setWithdrawAllFlag] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [fee, setFee] = useState<bigint>(0n)
  const [amountAfterFee, setAmountAfterFee] = useState<bigint>(0n)

  // Check if wallet is connected
  useEffect(() => {
    if (!signer && user) {
      connect()
    }
  }, [signer, user, connect])

  // Calculate fee when amount changes
  useEffect(() => {
    const calculateFee = async () => {
      if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
        const amountBigInt = toTokenAmount(parseFloat(amount), IDRX_DECIMALS)
        const feeAmount = await calculateWithdrawFee(amountBigInt)
        const afterFee = await calculateAmountAfterFee(amountBigInt)
        setFee(feeAmount)
        setAmountAfterFee(afterFee)
      } else {
        setFee(0n)
        setAmountAfterFee(0n)
      }
    }
    calculateFee()
  }, [amount])

  const handleWithdraw = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!user?.phone || !signer) {
        throw new Error("Wallet not connected")
      }

      if (!toAddress) {
        throw new Error("Please enter a destination address")
      }

      if (!amount && !withdrawAllFlag) {
        throw new Error("Please enter an amount or select withdraw all")
      }

      let receipt
      if (withdrawAllFlag) {
        receipt = await withdrawAll(user.phone, toAddress)
      } else {
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
          throw new Error("Please enter a valid amount")
        }
        const amountBigInt = toTokenAmount(parseFloat(amount), IDRX_DECIMALS)
        receipt = await withdraw(user.phone, toAddress, amountBigInt)
      }

      setTxHash(receipt.hash)
      setSuccess(true)

      // Refresh balance
      setTimeout(() => {
        refetchBalance()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Withdrawal failed")
    } finally {
      setIsLoading(false)
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
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card dark:bg-card rounded-3xl p-8 shadow-2xl animate-fade-in-up">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Withdrawal Successful!</h1>
              <p className="text-muted-foreground">
                {withdrawAllFlag ? 'All funds withdrawn' : `${Number(fromTokenAmount(amountAfterFee, IDRX_DECIMALS)).toLocaleString()} IDRX withdrawn`}
              </p>
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
            <ArrowUpRight className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Withdraw</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Balance Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/20 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Available Balance</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground">{formattedBalance}</p>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-2">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-orange-500 dark:text-orange-400">Withdrawal Fee</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A 1% fee applies to all withdrawals. This fee helps maintain the network and services.
                </p>
              </div>
            </div>
          </div>

          {/* Destination Address */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Destination Address</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              disabled={isLoading || isWithdrawing}
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Amount (IDRX)</label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setWithdrawAllFlag(false)
                }}
                placeholder="Enter amount"
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                disabled={isLoading || isWithdrawing || withdrawAllFlag}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button
                  onClick={handleMax}
                  className="px-3 py-1 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30 transition-colors"
                  disabled={isLoading || isWithdrawing}
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
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-semibold text-foreground">{Number(amount).toLocaleString()} IDRX</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fee (1%)</span>
                <span className="text-sm font-semibold text-orange-500">
                  -{Number(fromTokenAmount(fee, IDRX_DECIMALS)).toLocaleString()} IDRX
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">You'll Receive</span>
                <span className="text-lg font-bold text-green-500">
                  {Number(fromTokenAmount(amountAfterFee, IDRX_DECIMALS)).toLocaleString()} IDRX
                </span>
              </div>
            </div>
          )}

          {withdrawAllFlag && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Balance</span>
                <span className="text-sm font-semibold text-foreground">{formattedBalance}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Est. Fee (1%)</span>
                <span className="text-sm font-semibold text-orange-500">
                  -{Number(fromTokenAmount(fee, IDRX_DECIMALS)).toLocaleString()} IDRX
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
                isLoading ||
                isWithdrawing ||
                !toAddress ||
                (!amount && !withdrawAllFlag)
              }
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              {isLoading || isWithdrawing ? 'Withdrawing...' : `Withdraw ${withdrawAllFlag ? 'All' : amount} IDRX`}
            </button>

            <button
              onClick={handleBack}
              disabled={isLoading || isWithdrawing}
              className="w-full py-4 px-6 rounded-2xl bg-muted/50 text-foreground font-semibold text-lg hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

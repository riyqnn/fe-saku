"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useIDRX } from "@/hooks/useIDRX"
import { useDepositWithdraw } from "@/hooks/useDepositWithdraw"
import { useBalance } from "@/hooks/useBalance"
import { toTokenAmount, fromTokenAmount } from "@/lib/blockchain"
import { IDRX_DECIMALS } from "@/lib/config"

export default function DepositPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { signer, connect, address } = useWallet()
  const { approveUnlimited, allowance } = useIDRX(signer, address)
  const { deposit, isDepositing } = useDepositWithdraw(signer)
  const { formattedBalance, refetch: refetchBalance } = useBalance(address)

  const [amount, setAmount] = useState("")
  const [isApproved, setIsApproved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Check if wallet is connected
  useEffect(() => {
    if (!signer && user) {
      connect()
    }
  }, [signer, user, connect])

  // Check allowance
  useEffect(() => {
    const checkAllowance = async () => {
      if (amount && !isNaN(parseFloat(amount))) {
        const amountBigInt = toTokenAmount(parseFloat(amount), IDRX_DECIMALS)
        if (amountBigInt > 0n && allowance >= amountBigInt) {
          setIsApproved(true)
        } else {
          setIsApproved(false)
        }
      }
    }
    checkAllowance()
  }, [amount, allowance])

  const handleApprove = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!signer) {
        throw new Error("Please connect your wallet first")
      }

      await approveUnlimited()
      setIsApproved(true)
    } catch (err: any) {
      setError(err.message || "Failed to approve tokens")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!user?.phone || !signer) {
        throw new Error("Wallet not connected")
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Please enter a valid amount")
      }

      const amountBigInt = toTokenAmount(parseFloat(amount), IDRX_DECIMALS)

      const receipt = await deposit(user.phone, amountBigInt)

      setTxHash(receipt.hash)
      setSuccess(true)

      // Refresh balance
      setTimeout(() => {
        refetchBalance()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Deposit failed")
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

  if (success) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card dark:bg-card rounded-3xl p-8 shadow-2xl animate-fade-in-up">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Deposit Successful!</h1>
              <p className="text-muted-foreground">You have successfully deposited {Number(amount).toLocaleString()} IDRX</p>
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Deposit</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Balance Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Your Balance</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground">{formattedBalance}</p>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">How Deposit Works</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deposit IDRX tokens into your wallet using the smart contract. First approve the contract to spend your tokens, then deposit.
                </p>
              </div>
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
                disabled={isLoading || isDepositing}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                <button
                  onClick={() => setAmount("100000")}
                  className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                  disabled={isLoading || isDepositing}
                >
                  100K
                </button>
                <button
                  onClick={() => setAmount("500000")}
                  className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                  disabled={isLoading || isDepositing}
                >
                  500K
                </button>
                <button
                  onClick={() => setAmount("1000000")}
                  className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                  disabled={isLoading || isDepositing}
                >
                  1M
                </button>
              </div>
            </div>
          </div>

          {/* Approval Status */}
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${isApproved ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
              {isApproved ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isApproved ? 'text-green-500' : 'text-yellow-500'}`}>
                  {isApproved ? 'Contract Approved' : 'Approval Required'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isApproved ? 'You can deposit now' : 'Please approve the contract first'}
                </p>
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
            {!isApproved ? (
              <button
                onClick={handleApprove}
                disabled={!amount || isLoading || parseFloat(amount) <= 0}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isLoading ? 'Approving...' : 'Approve Contract'}
              </button>
            ) : (
              <button
                onClick={handleDeposit}
                disabled={!amount || isLoading || isDepositing || parseFloat(amount) <= 0}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isLoading || isDepositing ? 'Depositing...' : `Deposit ${amount} IDRX`}
              </button>
            )}

            <button
              onClick={handleBack}
              disabled={isLoading || isDepositing}
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

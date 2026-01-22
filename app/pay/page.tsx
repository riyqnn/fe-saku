"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Scan, CheckCircle, Clock, ArrowLeft } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useQRPayment } from "@/hooks/useQRPayment"
import { useIDRX } from "@/hooks/useIDRX"
import { useBalance } from "@/hooks/useBalance"
import { toTokenAmount, fromTokenAmount } from "@/lib/blockchain"
import { IDRX_DECIMALS } from "@/lib/config"

type TabType = "create" | "scan" | "my-qr"

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { signer, connect, address } = useWallet()
  const { createQRPayment, claimQRPayment, refundQRPayment, getQRPayment, isCreating, isClaiming } = useQRPayment(signer)
  const { approveUnlimited, allowance } = useIDRX(signer, address)
  const { formattedBalance, refetch: refetchBalance } = useBalance(address)

  const [activeTab, setActiveTab] = useState<TabType>("create")
  const [merchantPhone, setMerchantPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [qrHash, setQrHash] = useState("")
  const [scanQrHash, setScanQrHash] = useState("")
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

  const handleCreatePayment = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!merchantPhone || !amount) {
        throw new Error("Please fill in all fields")
      }

      if (!isApproved) {
        throw new Error("Please approve the contract first")
      }

      const amountBigInt = toTokenAmount(parseFloat(amount), IDRX_DECIMALS)
      const { qrHash: hash, receipt } = await createQRPayment(merchantPhone, amountBigInt)

      setQrHash(hash)
      setTxHash(receipt.hash)
      setSuccess(true)

      // Refresh balance
      setTimeout(() => {
        refetchBalance()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to create payment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClaimPayment = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!scanQrHash) {
        throw new Error("Please enter a QR hash")
      }

      const receipt = await claimQRPayment(scanQrHash)
      setTxHash(receipt.hash)
      setSuccess(true)

      setTimeout(() => {
        refetchBalance()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to claim payment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
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
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {activeTab === "create" ? "Payment Created!" : "Payment Claimed!"}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === "create"
                  ? `Payment of ${Number(amount).toLocaleString()} IDRP created successfully`
                  : "Payment claimed successfully"}
              </p>
            </div>

            {qrHash && (
              <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QR Hash</p>
                <p className="text-sm font-mono text-foreground break-all">{qrHash || scanQrHash}</p>
              </div>
            )}

            {txHash && (
              <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Hash</p>
                <p className="text-sm font-mono text-foreground break-all">{txHash}</p>
              </div>
            )}

            <button
              onClick={handleBack}
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
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">QR Payment</h1>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="p-4 sm:p-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "create"
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Create QR
          </button>
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "scan"
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Scan QR
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Balance Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/20 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Your Balance</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground">{formattedBalance}</p>
          </div>

          {/* Create QR Tab */}
          {activeTab === "create" && (
            <>
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-start gap-3">
                  <QrCode className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">Create QR Payment</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Create a QR payment that locks funds for a merchant to claim. Valid for 24 hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Merchant Phone Number</label>
                <input
                  type="tel"
                  value={merchantPhone}
                  onChange={(e) => setMerchantPhone(e.target.value)}
                  placeholder="+62..."
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  disabled={isLoading || isCreating}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Amount (IDRX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  disabled={isLoading || isCreating}
                />
              </div>

              {amount && !isApproved && parseFloat(amount) > 0 && (
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent to-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  {isLoading ? "Approving..." : "Approve Contract"}
                </button>
              )}

              <button
                onClick={handleCreatePayment}
                disabled={!merchantPhone || !amount || isLoading || isCreating || !isApproved}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-secondary to-accent text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isLoading || isCreating ? "Creating..." : "Create Payment QR"}
              </button>
            </>
          )}

          {/* Scan QR Tab */}
          {activeTab === "scan" && (
            <>
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-2">
                <div className="flex items-start gap-3">
                  <Scan className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-green-500 dark:text-green-400">Claim QR Payment</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter the QR hash to claim a payment sent to you. Only you (the merchant) can claim it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">QR Hash</label>
                <input
                  type="text"
                  value={scanQrHash}
                  onChange={(e) => setScanQrHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  disabled={isLoading || isClaiming}
                />
              </div>

              <button
                onClick={handleClaimPayment}
                disabled={!scanQrHash || isLoading || isClaiming}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isLoading || isClaiming ? "Claiming..." : "Claim Payment"}
              </button>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={handleBack}
            disabled={isLoading || isCreating || isClaiming}
            className="w-full py-4 px-6 rounded-2xl bg-muted/50 text-foreground font-semibold text-lg hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

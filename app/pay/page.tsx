"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Scan, CheckCircle, Clock, ArrowLeft, RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { useBalance } from "@/hooks/useBalance"

type TabType = "create" | "scan" | "refund" | "status"

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const walletAddress = user?.wallet_address || null
  const { createQRPayment, claimQRPayment, refundQRPayment, getQRPayment, creating, claiming, refunding } = useSakuQRPayment()
  const { formattedBalance, refetch: refetchBalance } = useBalance(walletAddress)

  const [activeTab, setActiveTab] = useState<TabType>("create")
  const [merchantPhone, setMerchantPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [qrHash, setQrHash] = useState("")
  const [scanQrHash, setScanQrHash] = useState("")
  const [refundQrHash, setRefundQrHash] = useState("")
  const [statusQrHash, setStatusQrHash] = useState("")
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleCreatePayment = async () => {
    try {
      setError(null)

      if (!merchantPhone || !amount) {
        throw new Error("Please fill in all fields")
      }

      const result = await createQRPayment({ merchantPhone, amount })

      if (result.success) {
        setQrHash(result.qrHash || "")
        setTxHash(result.transactionHash || null)
        setSuccess(true)

        setTimeout(() => {
          refetchBalance()
        }, 2000)
      } else {
        throw new Error(result.error || "Failed to create payment")
      }
    } catch (err: any) {
      setError(err.message || "Failed to create payment")
    }
  }

  const handleClaimPayment = async () => {
    try {
      setError(null)

      if (!scanQrHash) {
        throw new Error("Please enter a QR hash")
      }

      const result = await claimQRPayment({ qrHash: scanQrHash })

      if (result.success) {
        setTxHash(result.transactionHash || null)
        setSuccess(true)

        setTimeout(() => {
          refetchBalance()
        }, 2000)
      } else {
        throw new Error(result.error || "Failed to claim payment")
      }
    } catch (err: any) {
      setError(err.message || "Failed to claim payment")
    }
  }

  const handleRefundPayment = async () => {
    try {
      setError(null)

      if (!refundQrHash) {
        throw new Error("Please enter a QR hash")
      }

      const result = await refundQRPayment({ qrHash: refundQrHash })

      if (result.success) {
        setTxHash(result.transactionHash || null)
        setSuccess(true)
        setActiveTab("create") // Reset to default tab

        setTimeout(() => {
          refetchBalance()
        }, 2000)
      } else {
        throw new Error(result.error || "Failed to refund payment")
      }
    } catch (err: any) {
      setError(err.message || "Failed to refund payment")
    }
  }

  const handleCheckStatus = async () => {
    try {
      setError(null)
      setPaymentDetails(null)

      if (!statusQrHash) {
        throw new Error("Please enter a QR hash")
      }

      const result = await getQRPayment({ qrHash: statusQrHash })

      if (result.success && result.payment) {
        setPaymentDetails(result.payment)
      } else {
        throw new Error(result.error || "Failed to get payment details")
      }
    } catch (err: any) {
      setError(err.message || "Failed to get payment details")
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
                {activeTab === "create" ? "Payment Created!" :
                 activeTab === "scan" ? "Payment Claimed!" :
                 activeTab === "refund" ? "Refund Successful!" :
                 "Success!"}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === "create"
                  ? `Payment of ${Number(amount).toLocaleString()} IDRX created successfully`
                  : activeTab === "scan"
                  ? "Payment claimed successfully"
                  : activeTab === "refund"
                  ? "Payment refunded successfully"
                  : "Operation completed successfully"}
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
        <div className="p-2 sm:p-3 flex gap-1.5 border-b border-border overflow-x-auto">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 min-w-fit py-2.5 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === "create"
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Create QR
          </button>
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex-1 min-w-fit py-2.5 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === "scan"
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Claim QR
          </button>
          <button
            onClick={() => setActiveTab("refund")}
            className={`flex-1 min-w-fit py-2.5 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === "refund"
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Refund
          </button>
          <button
            onClick={() => setActiveTab("status")}
            className={`flex-1 min-w-fit py-2.5 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === "status"
                ? "bg-primary text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Status
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
                  disabled={creating}
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
                  disabled={creating}
                />
              </div>

              <button
                onClick={handleCreatePayment}
                disabled={!merchantPhone || !amount || creating}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-secondary to-accent text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {creating ? "Creating..." : "Create Payment QR"}
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
                  disabled={claiming}
                />
              </div>

              <button
                onClick={handleClaimPayment}
                disabled={!scanQrHash || claiming}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {claiming ? "Claiming..." : "Claim Payment"}
              </button>
            </>
          )}

          {/* Refund Tab */}
          {activeTab === "refund" && (
            <>
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-orange-500 dark:text-orange-400">Refund QR Payment</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Refund an expired QR payment (after 24 hours if not claimed). Only the original payer can refund.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">QR Hash</label>
                <input
                  type="text"
                  value={refundQrHash}
                  onChange={(e) => setRefundQrHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  disabled={refunding}
                />
              </div>

              <button
                onClick={handleRefundPayment}
                disabled={!refundQrHash || refunding}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {refunding ? "Refunding..." : "Refund Payment"}
              </button>
            </>
          )}

          {/* Status Tab */}
          {activeTab === "status" && (
            <>
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-purple-500 dark:text-purple-400">Check Payment Status</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Check the status and details of any QR payment using its hash.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">QR Hash</label>
                <input
                  type="text"
                  value={statusQrHash}
                  onChange={(e) => setStatusQrHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  disabled={false}
                />
              </div>

              <button
                onClick={handleCheckStatus}
                disabled={!statusQrHash}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                Check Status
              </button>

              {paymentDetails && (
                <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
                  <p className="text-sm font-semibold text-foreground">Payment Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">{Number(paymentDetails.amount).toLocaleString()} IDRX</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-semibold ${paymentDetails.claimed ? 'text-green-500' : 'text-orange-500'}`}>
                        {paymentDetails.claimed ? 'Claimed' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exists</span>
                      <span className="font-semibold">{paymentDetails.exists ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Can Refund</span>
                      <span className={`font-semibold ${paymentDetails.canRefund ? 'text-green-500' : 'text-gray-500'}`}>
                        {paymentDetails.canRefund ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires At</span>
                      <span className="font-semibold text-xs">
                        {new Date(paymentDetails.expiresAt * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
            disabled={creating || claiming || refunding}
            className="w-full py-4 px-6 rounded-2xl bg-muted/50 text-foreground font-semibold text-lg hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

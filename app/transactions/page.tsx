"use client"

import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Wallet, Receipt, DollarSign, QrCode, ExternalLink, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions, Transaction } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"

const TRANSACTION_CONFIG: Record<string, { icon: any; bgClass: string; textClass: string; label: string }> = {
  transfer_sent: {
    icon: ArrowUpRight,
    bgClass: "bg-red-100 dark:bg-red-900/30",
    textClass: "text-red-600 dark:text-red-400",
    label: "Transfer Sent",
  },
  transfer_received: {
    icon: ArrowDownLeft,
    bgClass: "bg-green-100 dark:bg-green-900/30",
    textClass: "text-green-600 dark:text-green-400",
    label: "Transfer Received",
  },
  topup: {
    icon: Wallet,
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    textClass: "text-blue-600 dark:text-blue-400",
    label: "Top Up",
  },
  withdraw: {
    icon: DollarSign,
    bgClass: "bg-orange-100 dark:bg-orange-900/30",
    textClass: "text-orange-600 dark:text-orange-400",
    label: "Withdrawal",
  },
  qr_created: {
    icon: QrCode,
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
    textClass: "text-purple-600 dark:text-purple-400",
    label: "QR Payment Created",
  },
  qr_claimed: {
    icon: Receipt,
    bgClass: "bg-teal-100 dark:bg-teal-900/30",
    textClass: "text-teal-600 dark:text-teal-400",
    label: "QR Payment Claimed",
  },
  qr_refunded: {
    icon: Receipt,
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
    textClass: "text-yellow-600 dark:text-yellow-400",
    label: "QR Payment Refunded",
  },
}

export default function TransactionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { transactions, isLoading, error, refetch, refreshing } = useTransactions(true)

  const handleBack = () => {
    router.push("/home")
  }

  const formatTransactionTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" })
  }

  const formatFullDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTransactionLabel = (tx: Transaction) => {
    const config = TRANSACTION_CONFIG[tx.type]
    if (!config) return tx.type

    if (tx.type === "transfer_sent" && tx.toName) {
      return `Sent to ${tx.toName === "You" ? "yourself" : tx.toName}`
    }
    if (tx.type === "transfer_received" && tx.fromName) {
      return `Received from ${tx.fromName === "You" ? "yourself" : tx.fromName}`
    }

    return config.label
  }

  const getAmountDisplay = (tx: Transaction) => {
    const isPositive = ["transfer_received", "topup", "qr_claimed"].includes(tx.type)
    return {
      prefix: isPositive ? "+" : "-",
      amount: tx.amount,
      class: isPositive ? "text-green-600 dark:text-green-400" : "text-foreground",
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 dark:bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-muted rounded-full transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Transactions</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
                </p>
              </div>
            </div>
            <button
              onClick={refetch}
              disabled={refreshing}
              className="p-2 hover:bg-muted rounded-full transition-colors duration-200 disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium">Loading transactions...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-8 text-center rounded-3xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 px-6 py-2 bg-destructive text-destructive-foreground rounded-xl font-semibold text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && transactions.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-muted/30 dark:bg-muted/10 border border-border/50">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No transactions yet. Start by making a transfer!</p>
          </div>
        )}

        {/* Transactions List */}
        {!isLoading && !error && transactions.length > 0 && (
          <div className="space-y-3">
            {transactions.map((tx, idx) => {
              const config = TRANSACTION_CONFIG[tx.type]
              const Icon = config?.icon || Receipt
              const amountDisplay = getAmountDisplay(tx)

              return (
                <a
                  key={tx.id}
                  href={`${NETWORK_CONFIG.blockExplorer}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="p-5 rounded-2xl card-modern hover:card-elevated group cursor-pointer transition-all duration-200 border border-border/50 hover:border-primary/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config?.bgClass} ${config?.textClass}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                              {getTransactionLabel(tx)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTransactionTime(tx.timestamp)}</span>
                            <span>•</span>
                            <span className="truncate">{formatFullDate(tx.timestamp)}</span>
                          </div>
                          {tx.txHash && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <span className="font-mono truncate">{tx.txHash.slice(0, 10)}...</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold text-lg ${amountDisplay.class}`}>
                          {amountDisplay.prefix}
                          {amountDisplay.amount}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">IDRX</p>
                      </div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

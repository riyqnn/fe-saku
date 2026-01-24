"use client"

import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet, Receipt, DollarSign, QrCode } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"

interface TransactionTypeConfig {
  icon: React.ElementType
  bgClass: string
  textClass: string
  label: string
}

const TRANSACTION_CONFIG: Record<string, TransactionTypeConfig> = {
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
  deposit: {
    icon: Wallet,
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    textClass: "text-blue-600 dark:text-blue-400",
    label: "Deposit",
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

export default function RecentTransactions() {
  const { user } = useAuth()
  const { transactions, refreshing } = useTransactions(true)

  const formatTransactionTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString("id-ID", { month: "short", day: "numeric" })
  }

  const getTransactionLabel = (tx: any) => {
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

  const getAmountDisplay = (tx: any) => {
    const isPositive = ["transfer_received", "deposit", "qr_claimed"].includes(tx.type)
    return {
      prefix: isPositive ? "+" : "-",
      amount: tx.amount,
      class: isPositive ? "text-green-600 dark:text-green-400" : "text-foreground",
    }
  }

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">
            Recent Activity
          </p>
          {refreshing && (
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <a
          href="/transactions"
          className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-accent transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-3xl bg-muted/30 dark:bg-muted/10 border border-border/50">
          <p className="text-sm text-muted-foreground">No transactions yet. Start by making a transfer!</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {transactions.slice(0, 5).map((tx, idx) => {
            const config = TRANSACTION_CONFIG[tx.type]
            const Icon = config?.icon || Receipt
            const amountDisplay = getAmountDisplay(tx)

            return (
              <a
                key={tx.id}
                href={`${NETWORK_CONFIG.blockExplorer}/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block animate-fade-in-scale"
                style={{ animationDelay: `${300 + idx * 50}ms` }}
              >
                <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl card-modern hover:card-elevated group cursor-pointer transition-all duration-200 border border-border/50 hover:border-primary/30">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config?.bgClass} ${config?.textClass}`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                        {getTransactionLabel(tx)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatTransactionTime(tx.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`font-bold text-sm sm:text-base ${amountDisplay.class}`}>
                      {amountDisplay.prefix}{amountDisplay.amount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">IDRX</p>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

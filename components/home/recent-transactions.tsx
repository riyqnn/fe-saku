"use client"

import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useRecentTransfers } from "@/hooks/useRecentTransfers"

export default function RecentTransactions() {
  const { user } = useAuth()
  const { transfers, refreshing: transfersRefreshing } = useRecentTransfers(user?.phone || null)

  const formatTransactionTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-700 delay-200">
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Transactions {transfersRefreshing && <span className="text-xs ml-2">↻</span>}
        </p>
        <a href="/transfer" className="text-xs font-semibold text-primary hover:text-secondary smooth-transition">
          View All
        </a>
      </div>

      {transfers.length === 0 ? (
        <div className="p-6 sm:p-8 text-center">
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {transfers.map((transfer, idx) => (
            <div
              key={transfer.id}
              className="animate-in slide-in-from-left-4 duration-500 fill-mode-both"
              style={{ animationDelay: `${300 + idx * 50}ms` }}
            >
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-card dark:bg-card/80 border border-border/50 hover:border-primary/30 smooth-transition group cursor-pointer">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      transfer.type === "received"
                        ? "bg-success/10 dark:bg-success/20 text-success"
                        : "bg-destructive/10 dark:bg-destructive/20 text-destructive"
                    }`}
                  >
                    {transfer.type === "received" ? (
                      <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-xs sm:text-sm truncate">
                      {transfer.type === "received" ? transfer.senderName : transfer.receiverName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transfer.type === "received" ? "Received" : "Sent"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p
                    className={`font-semibold text-xs sm:text-sm ${
                      transfer.type === "received" ? "text-success" : "text-foreground"
                    }`}
                  >
                    {transfer.type === "received" ? "+" : "-"}{transfer.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTransactionTime(transfer.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

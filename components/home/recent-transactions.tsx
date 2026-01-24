"use client"

import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useRecentTransfers } from "@/hooks/useRecentTransfers"

export default function RecentTransactions() {
  const { user } = useAuth()
  const { transfers, refreshing: transfersRefreshing } = useRecentTransfers(user?.phone_number || null)

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
    <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">
            Recent Activity
          </p>
          {transfersRefreshing && (
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <a href="/transfer" className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-accent transition-colors">
          View All
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {transfers.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-3xl bg-muted/30 dark:bg-muted/10 border border-border/50">
          <p className="text-sm text-muted-foreground">No transactions yet. Start by making a transfer!</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {transfers.slice(0, 5).map((transfer, idx) => (
            <div
              key={transfer.id}
              className="animate-fade-in-scale"
              style={{ animationDelay: `${300 + idx * 50}ms` }}
            >
              <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl card-modern hover:card-elevated group cursor-pointer transition-all duration-200 border border-border/50 hover:border-primary/30">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm sm:text-base ${
                      transfer.type === "received"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {transfer.type === "received" ? (
                      <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                      {transfer.type === "received" ? transfer.senderName : transfer.receiverName}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {transfer.type === "received" ? "Received from" : "Sent to"} Saku
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p
                    className={`font-bold text-sm sm:text-base ${
                      transfer.type === "received" 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-foreground"
                    }`}
                  >
                    {transfer.type === "received" ? "+" : "-"}{transfer.amount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatTransactionTime(transfer.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

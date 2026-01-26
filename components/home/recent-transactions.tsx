"use client"
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet, DollarSign, Receipt, QrCode } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"

const TRANSACTION_CONFIG: Record<string, any> = {
  transfer_sent: { icon: ArrowUpRight, bgClass: "bg-red-100", textClass: "text-red-600", label: "Transfer Sent" },
  transfer_received: { icon: ArrowDownLeft, bgClass: "bg-green-100", textClass: "text-green-600", label: "Transfer Received" },
  topup: { icon: Wallet, bgClass: "bg-blue-100", textClass: "text-blue-600", label: "Top Up" },
  withdraw: { icon: DollarSign, bgClass: "bg-orange-100", textClass: "text-orange-600", label: "Withdrawal" },
  qr_claimed: { icon: Receipt, bgClass: "bg-teal-100", textClass: "text-teal-600", label: "QR Claimed" },
  qr_created: { icon: QrCode, bgClass: "bg-purple-100", textClass: "text-purple-600", label: "QR Created" },
}

export default function RecentTransactions() {
  const { user } = useAuth()
  const { transactions, refreshing } = useTransactions()

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div>
      <h3>Recent Transactions {refreshing && "(Refreshing...)"}</h3>
      {transactions.length === 0 ? (
        <p>No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const isSent = tx.sender_phone === user?.phone_number
            const type = isSent ? 'transfer_sent' : 'transfer_received'
            const config = TRANSACTION_CONFIG[type] || {}
            const Icon = config.icon || Receipt

            return (
              <a key={tx.id} href={`${NETWORK_CONFIG.blockExplorer}/tx/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer" className="flex justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`${config.bgClass} p-2 rounded-full`}>
                    <Icon className={`${config.textClass}`} />
                  </div>
                  <div>
                    <p>{isSent ? `Sent to ${tx.receiver_phone}` : `Received from ${tx.sender_phone}`}</p>
                    <p className="text-xs text-gray-500">{formatTime(tx.timestamp)}</p>
                  </div>
                </div>
                <div>
                  <p className="font-bold">{tx.amount} IDRX</p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

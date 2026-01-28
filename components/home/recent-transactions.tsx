"use client"
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet, DollarSign, Receipt, QrCode, Loader2 } from "lucide-react"
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
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs sm:text-sm font-bold text-black/85 uppercase tracking-widest">
          Recent Transactions {refreshing && <Loader2 className="inline w-3 h-3 animate-spin ml-2" />}
        </h3>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-10 px-6 bg-muted/30 rounded-[2.5rem] border border-dashed border-black/5">
          <Receipt className="w-12 h-12 text-black/10 mx-auto mb-3" />
          <p className="text-sm font-semibold text-black/40">No transactions yet</p>
          <p className="text-xs text-black/30 mt-1">Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const isSent = tx.sender_phone === user?.phone_number
            const type = isSent ? 'transfer_sent' : 'transfer_received'
            const config = TRANSACTION_CONFIG[type] || {}
            const Icon = config.icon || Receipt

            // LOGIC PERUBAHAN NAMA DISINI
            // Jika user mengirim (Sent), tampilkan nama penerima.
            // Jika user menerima (Received), tampilkan nama pengirim.
            const displayName = isSent 
              ? (tx.receiver_name || tx.receiver_phone) 
              : (tx.sender_name || tx.sender_phone)

            return (
              <a 
                key={tx.id} 
                href={`${NETWORK_CONFIG.blockExplorer}/tx/${tx.tx_hash}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex justify-between items-center p-4 bg-white border border-black/5 rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`${config.bgClass} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${config.textClass}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black/85 capitalize">
                      {isSent ? `Sent to ${displayName}` : `Received from ${displayName}`}
                    </p>
                    <p className="text-xs text-black/40 font-medium">{formatTime(tx.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                    {isSent ? '-' : '+'}{tx.amount} IDRX
                  </p>
                  <ChevronRight className="w-4 h-4 text-black/20 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
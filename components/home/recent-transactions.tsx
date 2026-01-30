"use client"
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet, DollarSign, Receipt, QrCode, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"

// Pastikan key disini match dengan logic di komponen bawah
const TRANSACTION_CONFIG: Record<string, any> = {
  transfer_sent: { icon: ArrowUpRight, bgClass: "bg-red-100", textClass: "text-red-600" },
  transfer_received: { icon: ArrowDownLeft, bgClass: "bg-green-100", textClass: "text-green-600" },
  topup: { icon: Wallet, bgClass: "bg-blue-100", textClass: "text-blue-600" },
  withdraw: { icon: DollarSign, bgClass: "bg-orange-100", textClass: "text-orange-600" },
  default: { icon: Receipt, bgClass: "bg-gray-100", textClass: "text-gray-600" }
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
            // --- LOGIC PENENTUAN TIPE TRANSAKSI ---
            let configKey = 'default'
            let titleText = ''
            let amountPrefix = ''
            let amountColor = ''
            let counterpartyName = ''

            // Kita cek berdasarkan 'type' dari database (TRANSFER / TOPUP / WITHDRAW)
            // Pastikan database menyimpannya sebagai uppercase, atau gunakan .toUpperCase()
            const txType = tx.type?.toUpperCase() || 'TRANSFER' 

            if (txType === 'TOPUP') {
              // --- LOGIC TOP UP ---
              configKey = 'topup'
              titleText = 'Top Up Successful'
              amountPrefix = '+'
              amountColor = 'text-blue-600'
              counterpartyName = 'IDRX Wallet' // Atau 'From Bank'

            } else if (txType === 'WITHDRAW') {
              // --- LOGIC WITHDRAW ---
              configKey = 'withdraw'
              titleText = 'Withdrawal'
              amountPrefix = '-'
              amountColor = 'text-orange-600'
              counterpartyName = 'To External Account'

            } else {
              // --- LOGIC TRANSFER (P2P) ---
              const isSent = tx.sender_phone === user?.phone_number
              configKey = isSent ? 'transfer_sent' : 'transfer_received'
              
              // Tentukan nama lawan transaksi
              // Jika kita kirim -> tampilkan nama penerima
              // Jika kita terima -> tampilkan nama pengirim
              counterpartyName = isSent 
                ? (tx.receiver_name || tx.receiver_phone || 'Unknown') 
                : (tx.sender_name || tx.sender_phone || 'Unknown')
              
              titleText = isSent ? `Sent to ${counterpartyName}` : `Received from ${counterpartyName}`
              amountPrefix = isSent ? '-' : '+'
              amountColor = isSent ? 'text-red-600' : 'text-green-600'
            }

            const config = TRANSACTION_CONFIG[configKey] || TRANSACTION_CONFIG.default
            const Icon = config.icon

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
                    <p className="text-sm font-bold text-black/85 capitalize truncate max-w-[180px]">
                      {titleText}
                    </p>
                    <p className="text-xs text-black/40 font-medium">
                        {/* Jika Topup, tampilkan sumbernya, jika transfer tampilkan waktu */}
                        {txType === 'TOPUP' ? 'Via Top Up' : formatTime(tx.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${amountColor}`}>
                    {amountPrefix}{tx.amount} IDRX
                  </p>
                  <p className="text-[10px] text-black/30 mt-0.5">
                    {formatTime(tx.timestamp)}
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
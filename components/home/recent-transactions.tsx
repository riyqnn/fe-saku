"use client"

import {
  ArrowDownLeft, ArrowUpRight, Wallet, DollarSign, Receipt,
  Loader2, Share2, Gift
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"

const TRANSACTION_CONFIG: Record<string, any> = {
  transfer_sent: { icon: ArrowUpRight, bgClass: "bg-red-50", textClass: "text-red-500", label: "Transfer Sent" },
  transfer_received: { icon: ArrowDownLeft, bgClass: "bg-green-50", textClass: "text-green-500", label: "Transfer Received" },
  topup: { icon: Wallet, bgClass: "bg-blue-50", textClass: "text-blue-500", label: "Top Up" },
  withdraw: { icon: DollarSign, bgClass: "bg-orange-50", textClass: "text-orange-500", label: "Withdrawal" },
  packet_create: { icon: Gift, bgClass: "bg-orange-100", textClass: "text-orange-600", label: "Amplop Created" },
  packet_claim: { icon: Gift, bgClass: "bg-pink-100", textClass: "text-pink-600", label: "Amplop Claimed" },
  default: { icon: Receipt, bgClass: "bg-gray-50", textClass: "text-gray-500", label: "Payment" }
}

export default function RecentTransactions({ onTxSelect }: { onTxSelect: (tx: any) => void }) {
  const { user } = useAuth()
  const { transactions, refreshing } = useTransactions()

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[11px] font-black text-black/40 tracking-widest italic">
          Recent Activity {refreshing && <Loader2 className="inline w-3 h-3 animate-spin ml-2" />}
        </h3>
      </div>

      <div className="max-h-[400px] scrollbar-hide overflow-y-auto pr-1 space-y-2">
        {transactions.length === 0 ? (
          <div className="text-center py-10 px-6 bg-white rounded-[2.5rem] border border-dashed border-black/10">
            <Receipt className="w-12 h-12 text-black/5 mx-auto mb-3" />
            <p className="text-[10px] font-black text-black/20 tracking-widest italic">No activity yet</p>
          </div>
        ) : (
          transactions.map(tx => {
            const txType = tx.type?.toUpperCase()
            
            // LOGIKA PENENTUAN TIPE & ICON
            const isSent = tx.sender_phone === user?.phone_number || txType === 'PACKET_CREATE'
            
            let configKey = 'default'
            if (txType === 'TOPUP') configKey = 'topup'
            else if (txType === 'WITHDRAW') configKey = 'withdraw'
            else if (txType === 'PACKET_CREATE') configKey = 'packet_create'
            else if (txType === 'PACKET_CLAIM') configKey = 'packet_claim'
            else if (isSent) configKey = 'transfer_sent'
            else configKey = 'transfer_received'

            const config = TRANSACTION_CONFIG[configKey] || TRANSACTION_CONFIG.default
            const Icon = config.icon

            // NAMA YANG DITAMPILKAN
            let displayName = config.label
            if (txType === 'TRANSFER') {
                displayName = isSent ? (tx.receiver_name || tx.receiver_phone) : (tx.sender_name || tx.sender_phone)
            } else if (txType === 'PACKET_CREATE') {
                displayName = "Distributed Amplop"
            } else if (txType === 'PACKET_CLAIM') {
                displayName = "Claimed Amplop"
            }

            return (
              <div 
                key={tx.id} 
                onClick={() => window.open(`${NETWORK_CONFIG.blockExplorer}/tx/${tx.tx_hash}`, '_blank')}
                className="flex justify-between items-center p-5 bg-white border border-black/[0.03] rounded-[2rem] hover:border-primary/40 transition-all group active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`${config.bgClass} p-3.5 rounded-2xl group-hover:rotate-12 transition-transform`}>
                    <Icon className={`w-5 h-5 ${config.textClass}`} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-black italic truncate leading-tight">
                      {displayName || 'System'}
                    </p>
                    <p className="text-[9px] font-black text-black/20 tracking-wider">
                      {formatTime(tx.timestamp)} • {txType?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-black text-sm tracking-tighter italic ${isSent ? 'text-red-500' : 'text-green-600'}`}>
                      {isSent ? '-' : '+'}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-black text-black/10 italic">IDRX</p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onTxSelect(tx);
                    }}
                    className="p-3 bg-black/5 hover:bg-primary/20 rounded-2xl transition-all group-hover:scale-110"
                  >
                    <Share2 size={14} className="text-black/30 group-hover:text-primary" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
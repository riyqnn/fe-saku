"use client"

import { useState, useRef } from "react"
import { 
  ArrowDownLeft, ArrowUpRight, Wallet, DollarSign, Receipt, QrCode, 
  Loader2, Share2, X, Download, MessageCircle, CheckCircle2, ExternalLink 
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import Image from "next/image"

const TRANSACTION_CONFIG: Record<string, any> = {
  transfer_sent: { icon: ArrowUpRight, bgClass: "bg-red-50", textClass: "text-red-500", label: "Transfer Sent" },
  transfer_received: { icon: ArrowDownLeft, bgClass: "bg-green-50", textClass: "text-green-500", label: "Transfer Received" },
  topup: { icon: Wallet, bgClass: "bg-blue-50", textClass: "text-blue-500", label: "Top Up" },
  withdraw: { icon: DollarSign, bgClass: "bg-orange-50", textClass: "text-orange-500", label: "Withdrawal" },
  default: { icon: Receipt, bgClass: "bg-gray-50", textClass: "text-gray-500", label: "Payment" }
}

export default function RecentTransactions() {
  const { user } = useAuth()
  const { transactions, refreshing } = useTransactions()
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  }

  const shareToWhatsApp = (tx: any) => {
    const isSent = tx.sender_phone === user?.phone_number;
    const target = isSent ? (tx.receiver_name || tx.receiver_phone) : (tx.sender_name || tx.sender_phone);
    
     const text = `*SAKU RECEIPT*%0A` +
                  `--------------------------%0A` +
                  `*Amount:* IDR ${tx.amount.toLocaleString()}%0A` +
                  `*Date:* ${new Date(tx.timestamp).toLocaleString('en-US')}%0A` +
                  `*${isSent ? 'To' : 'From'}:* ${target}%0A` +
                  `*Status:* Success ✅`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current || !selectedTx) return
    setIsGenerating(true)
    const loadingToast = toast.loading("Generating HD receipt...")
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#f8f9fa', pixelRatio: 4 })
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `SAKU-RECEIPT-${String(selectedTx.id).slice(0, 8)}.png`;
      link.click();
      toast.success("Receipt saved!");
    } catch (err) {
      toast.error("Failed to generate image.");
    } finally {
      toast.dismiss(loadingToast);
      setIsGenerating(false);
    }
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
            const txType = tx.type?.toUpperCase() || 'TRANSFER'
            const isSent = tx.sender_phone === user?.phone_number
            let configKey = txType === 'TOPUP' ? 'topup' : txType === 'WITHDRAW' ? 'withdraw' : isSent ? 'transfer_sent' : 'transfer_received'
            const config = TRANSACTION_CONFIG[configKey] || TRANSACTION_CONFIG.default
            const Icon = config.icon

            const counterparty = isSent ? (tx.receiver_name || tx.receiver_phone) : (tx.sender_name || tx.sender_phone)

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
                      {txType === 'TOPUP' ? 'Wallet Top Up' : counterparty || 'System'}
                    </p>
                    <p className="text-[9px] font-black text-black/20 tracking-wider">
                      {formatTime(tx.timestamp)} • {txType}
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
                  
                  {/* SHARE BUTTON: Triggers the Modal Struk */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Blocks the BaseScan link from opening
                      setSelectedTx(tx);
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

      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm flex flex-col gap-6">
            
            <div 
              ref={receiptRef}
              className="bg-white text-black p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Image src="/logo.png" alt="Saku" width={36} height={36} className="grayscale" />
                  <p className="text-[8px] font-black tracking-[0.2em] text-black/30 italic">Digital Proof</p>
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[10px] font-black italic">Saku Wallet</p>
                   <p className="text-[8px] font-bold text-black/30">Ref: #{String(selectedTx.id).slice(0,8).toUpperCase()}</p>
                </div>
              </div>

              <div className="flex flex-col items-center py-4 text-center border-y border-dashed border-black/10">
                <CheckCircle2 size={48} className="text-green-500 mb-4" strokeWidth={3} />
                <h2 className="text-[10px] font-black tracking-[0.3em] text-black/40 mb-1 italic">Payment Successful</h2>
                <p className="text-5xl font-black tracking-tighter mb-1 italic">IDR {selectedTx.amount.toLocaleString()}</p>
                <p className="text-[9px] font-black text-black/20 tracking-widest">
                  {new Date(selectedTx.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'TYPE', value: selectedTx.type?.replace('_', ' ').toUpperCase() },
                  { label: selectedTx.sender_phone === user?.phone_number ? 'SENT TO' : 'FROM', value: (selectedTx.sender_phone === user?.phone_number ? (selectedTx.receiver_name || selectedTx.receiver_phone) : (selectedTx.sender_name || selectedTx.sender_phone)) || 'SYSTEM' },
                  { label: 'FEE', value: 'IDR 0 (FREE)' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px] items-center">
                    <span className="text-black/30 font-black tracking-widest italic">{item.label}</span>
                    <span className="font-black italic text-black/80">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-dashed border-black/10 text-center">
                 <p className="text-[7px] font-mono text-black/30 break-all leading-relaxed px-4">{selectedTx.tx_hash}</p>
                 <p className="text-[8px] font-black italic text-black/20 mt-4 tracking-widest italic">Secure On-Chain Data</p>
              </div>

              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-black/5 rounded-full shadow-inner"></div>
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-black/5 rounded-full shadow-inner"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => shareToWhatsApp(selectedTx)}
                className="col-span-2 py-5 bg-[#25D366] text-white rounded-[2rem] font-black text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all tracking-[0.2em] italic"
              >
                <MessageCircle size={20} fill="white" /> Share to WA
              </button>
              
              <button 
                onClick={downloadReceipt}
                disabled={isGenerating}
                className="py-5 bg-white text-black rounded-[2rem] font-black text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all tracking-widest italic"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                Save PNG
              </button>

              <button 
                onClick={() => setSelectedTx(null)} 
                className="py-5 bg-black text-white rounded-[2rem] font-black text-[10px] flex items-center justify-center gap-2 tracking-widest italic"
              >
                <X size={16} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
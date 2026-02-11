"use client"

import { useState, useRef } from "react"
import { 
  ArrowDownLeft, ArrowUpRight, Wallet, DollarSign, Receipt, QrCode, 
  Loader2, Share2, X, Download, MessageCircle, CheckCircle2, Gift 
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
  packet_create: { icon: Gift, bgClass: "bg-orange-100", textClass: "text-orange-600", label: "Amplop Created" },
  packet_claim: { icon: Gift, bgClass: "bg-pink-100", textClass: "text-pink-600", label: "Amplop Claimed" },
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

  // Helper functions for sharing & download remain the same...
  const base64ToBlob = (base64: string, type: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type });
  };

  const shareToWhatsApp = async (tx: any) => {
    const targetTx = tx || selectedTx;
    if (!receiptRef.current || !targetTx) return;
    setIsGenerating(true);
    const loadingToast = toast.loading("Preparing receipt...");
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#f8f9fa', pixelRatio: 4 });
      const blob = base64ToBlob(dataUrl, 'image/png');
      const file = new File([blob], `Saku-Receipt-${String(targetTx.id).slice(0, 8)}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Saku Receipt' });
      } else {
        const uploadRes = await fetch('/api/upload-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl, filename: `Saku-Receipt-${String(targetTx.id).slice(0, 8)}.png` }),
        });
        const { url } = await uploadRes.json();
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
      }
      toast.success("Done!");
    } catch (err) {
      toast.error("Failed to share.");
    } finally {
      toast.dismiss(loadingToast);
      setIsGenerating(false);
    }
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current || !selectedTx) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#f8f9fa', pixelRatio: 4 })
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `SAKU-RECEIPT-${String(selectedTx.id).slice(0, 8)}.png`;
      link.click();
    } finally {
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

      {/* MODAL STRUK (selectedTx) - Logic remains the same as before */}
      {selectedTx && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/50 backdrop-blur-md animate-in fade-in">
           {/* ... bagian modal struk yang sama seperti kode sebelumnya ... */}
           {/* Saya singkat agar tidak terlalu panjang, tapi pastikan variabel label di dalam struk juga update */}
           <div className="w-full max-w-xs flex flex-col gap-4">
              <div ref={receiptRef} className="bg-white text-black p-6 rounded-[2.5rem] shadow-2xl space-y-5 relative">
                  {/* Bagian Logo & Ref */}
                  <div className="flex justify-between items-start">
                    <Image src="/logo.png" alt="Saku" width={36} height={36} className="grayscale" />
                    <p className="text-[8px] font-bold text-black/30">Ref: #{String(selectedTx.id).slice(0,8).toUpperCase()}</p>
                  </div>

                  {/* Bagian Amount */}
                  <div className="flex flex-col items-center py-4 text-center border-y border-dashed border-black/10">
                    <CheckCircle2 size={48} className="text-green-500 mb-4" strokeWidth={3} />
                    <p className="text-4xl font-black tracking-tighter italic">IDR {selectedTx.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-black/20">{formatTime(selectedTx.timestamp)}</p>
                  </div>

                  {/* Bagian Detail */}
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-black/30 font-black italic">TYPE</span>
                      <span className="font-black italic">{selectedTx.type?.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-dashed border-black/10 text-center">
                    <p className="text-[7px] font-mono text-black/30 break-all">{selectedTx.tx_hash}</p>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => shareToWhatsApp(selectedTx)} className="col-span-2 py-5 bg-[#25D366] text-white rounded-[2rem] font-black text-xs flex items-center justify-center gap-3">
                  <MessageCircle size={20} fill="white" /> Share to WA
                </button>
                <button onClick={downloadReceipt} className="py-5 bg-white text-black rounded-[2rem] font-black text-[10px] flex items-center justify-center gap-2">
                  <Download size={16} /> Save PNG
                </button>
                <button onClick={() => setSelectedTx(null)} className="py-5 bg-black text-white rounded-[2rem] font-black text-[10px]">
                  <X size={16} className="mx-auto" />
                </button>
              </div>
           </div>
         </div>
      )}
    </div>
  )
}
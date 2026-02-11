"use client"

import { useState, useRef } from "react"
import { 
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Wallet, Receipt, DollarSign, 
  QrCode, ExternalLink, RefreshCw, X, Download, CheckCircle2, MessageCircle, Loader2, Share2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"
import BottomNavigation from "@/components/home/bottom-navigation"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import Image from "next/image"

type Transaction = {
  id: string | number
  type: string
  amount: number
  timestamp: string
  tx_hash?: string
  sender_phone?: string
  receiver_phone?: string
  sender_name?: string
  receiver_name?: string
}

const TRANSACTION_CONFIG: Record<string, { icon: any; bgClass: string; textClass: string; label: string }> = {
  transfer_sent: { icon: ArrowUpRight, bgClass: "bg-red-50", textClass: "text-red-500", label: "Transfer Sent" },
  transfer_received: { icon: ArrowDownLeft, bgClass: "bg-green-50", textClass: "text-green-500", label: "Transfer Received" },
  topup: { icon: Wallet, bgClass: "bg-blue-50", textClass: "text-blue-500", label: "Top Up" },
  withdraw: { icon: DollarSign, bgClass: "bg-orange-50", textClass: "text-orange-500", label: "Withdrawal" },
  qr_created: { icon: QrCode, bgClass: "bg-purple-50", textClass: "text-purple-500", label: "QR Created" },
  qr_claimed: { icon: Receipt, bgClass: "bg-teal-50", textClass: "text-teal-500", label: "QR Payment" },
  qr_refunded: { icon: Receipt, bgClass: "bg-yellow-50", textClass: "text-yellow-500", label: "Refunded" },
  packet_create: { icon: ArrowUpRight, bgClass: "bg-orange-50", textClass: "text-orange-500", label: "Amplop Created" },
  packet_claim: { icon: ArrowDownLeft, bgClass: "bg-pink-50", textClass: "text-pink-500", label: "Amplop Claimed" },
}


export default function TransactionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { transactions, refreshing, refetch } = useTransactions(true)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  // Helper function to convert base64 to Blob
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

  const shareToWhatsApp = async (tx: Transaction | null = selectedTx) => {
    const targetTx = tx || selectedTx;
    if (!receiptRef.current || !targetTx) return;

    setIsGenerating(true);
    const loadingToast = toast.loading("Preparing receipt...");

    try {
      // Generate PNG from receipt element
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#f8f9fa',
        pixelRatio: 4,
      });

      // Convert base64 to Blob directly
      const blob = base64ToBlob(dataUrl, 'image/png');

      // Create File object for sharing
      const file = new File(
        [blob],
        `Saku-Receipt-${String(targetTx.id).slice(0, 8)}.png`,
        { type: 'image/png' }
      );

      // Try Web Share API first (works on mobile - sends actual image)
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Saku Receipt',
        });
        toast.success("Receipt shared!");
      } else {
        // Fallback: Upload and share link (desktop)
        const filename = `Saku-Receipt-${String(targetTx.id).slice(0, 8)}.png`;
        const uploadRes = await fetch('/api/upload-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl, filename }),
        });

        if (!uploadRes.ok) {
          throw new Error('Upload failed');
        }

        const { url } = await uploadRes.json();

        // Share just the image link
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
        toast.success("Opening WhatsApp...");
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to share receipt.");
    } finally {
      toast.dismiss(loadingToast);
      setIsGenerating(false);
    }
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current || !selectedTx) return
    setIsGenerating(true)
    const loadingToast = toast.loading("Generating receipt...")
    
    try {    
      const dataUrl = await toPng(receiptRef.current, { 
        cacheBust: true, 
        backgroundColor: '#f8f9fa',
        pixelRatio: 4, 
      })
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Saku-Receipt-${String(selectedTx.id).slice(0, 8)}.png`;
      link.click();
      toast.success("Saved to gallery!");
    } catch (err) {
      toast.error("Failed to generate image.");
    } finally {
      toast.dismiss(loadingToast)
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen h-dvh pb-24 font-sans max-w-lg mx-auto text-black">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-black/[0.03] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/home")} className="p-2.5 hover:bg-black/5 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="text-xl font-bold italic tracking-tighter">History</h1>
        </div>
        <button onClick={refetch} disabled={refreshing} className="p-2.5 bg-black/5 rounded-xl">
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <main className="px-6 py-8 space-y-4 pb-32">
        {!refreshing && transactions.map((tx) => {
          // Logika isSent: Create (Uang keluar), Claim (Uang masuk)
          const isSent = tx.sender_phone === user?.phone_number || tx.type === 'PACKET_CREATE';
          
          const config = TRANSACTION_CONFIG[tx.type.toLowerCase()] || TRANSACTION_CONFIG['topup'];
          const Icon = config.icon;

          // Nama yang ditampilkan
          let displayName = config.label;
          if (tx.type === 'TRANSFER') {
            displayName = isSent ? (tx.receiver_name || tx.receiver_phone) : (tx.sender_name || tx.sender_phone);
          } else if (tx.type === 'PACKET_CREATE') {
            displayName = "Distributed Amplop";
          } else if (tx.type === 'PACKET_CLAIM') {
            displayName = "Claimed Amplop";
          }

          return (
            <div 
              key={tx.id} 
              className="p-5 rounded-[2.2rem] bg-white border border-black/[0.02] shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => window.open(`${NETWORK_CONFIG.blockExplorer}/tx/${tx.tx_hash}`, '_blank')}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${config.bgClass} ${config.textClass}`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-black italic leading-tight">
                    {displayName || 'System'}
                  </p>
                  <p className="text-[9px] font-black text-black/20 tracking-widest">
                    {new Date(tx.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {tx.type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-black text-base tracking-tighter ${isSent ? 'text-red-500' : 'text-green-600'}`}>
                    {isSent ? '-' : '+'} {tx.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-black text-black/10 italic">IDRX</p>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    setSelectedTx(tx);
                  }}
                  className="p-3 bg-black/5 hover:bg-primary/20 rounded-2xl transition-all group-hover:scale-110"
                >
                  <Share2 size={16} className="text-black/30 group-hover:text-primary" />
                </button>
              </div>
            </div>
          )
        })}
      </main>

      {/* --- INI BAGIAN MODAL YANG DIUBAH MENJADI VERSI KECIL/COMPACT --- */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/50 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xs flex flex-col gap-4">
            
            <div 
              ref={receiptRef}
              className="bg-white text-black p-6 rounded-[2.5rem] shadow-2xl space-y-5 relative"
            >
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)`
              }}></div>
              
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

      <BottomNavigation />
    </div>
  )
}
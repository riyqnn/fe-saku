"use client"

import { useState, useRef, useMemo } from "react"
import { 
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Wallet, Receipt, DollarSign, 
  QrCode, RefreshCw, X, Download, CheckCircle2, MessageCircle, Loader2, Share2, Search,
  ReceiptIcon
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTransactions } from "@/hooks/useTransactions"
import { NETWORK_CONFIG } from "@/lib/config"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import Image from "next/image"
import BottomNavigation from "@/components/home/bottom-navigation"

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
  description?: string
}

const TRANSACTION_CONFIG: Record<string, { icon: any; bgClass: string; textClass: string; label: string }> = {
  transfer: { icon: ArrowUpRight, bgClass: "bg-primary/10", textClass: "text-primary", label: "transfer" },
  topup: { icon: Wallet, bgClass: "bg-emerald-50", textClass: "text-emerald-600", label: "top up" },
  withdraw: { icon: DollarSign, bgClass: "bg-orange-50", textClass: "text-orange-600", label: "withdraw" },
  qr_payment: { icon: QrCode, bgClass: "bg-blue-50", textClass: "text-blue-600", label: "qr payment" },
  split_bill_settlement: { icon: Receipt, bgClass: "bg-purple-50", textClass: "text-purple-600", label: "split bill" },
  packet_create: { icon: ArrowUpRight, bgClass: "bg-amber-50", textClass: "text-amber-600", label: "distributed amplop" },
  packet_claim: { icon: ArrowDownLeft, bgClass: "bg-pink-50", textClass: "text-pink-600", label: "claimed amplop" },
}

export default function TransactionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { transactions, refreshing, refetch } = useTransactions(true)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const receiptRef = useRef<HTMLDivElement>(null)

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = activeFilter === "ALL" || tx.type === activeFilter
      return matchesSearch && matchesCategory
    })
  }, [transactions, searchTerm, activeFilter])

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(tx)
    })
    return groups
  }, [filteredTransactions])

  const downloadReceipt = async () => {
    if (!receiptRef.current) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(receiptRef.current, { 
        cacheBust: true, 
        backgroundColor: '#1a1a1a', 
        pixelRatio: 3 
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `SAKU-RECEIPT-${selectedTx?.id}.png`
      link.click()
      toast.success("Saved to gallery!")
    } catch (err) {
      toast.error("Failed to save receipt")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col max-w-lg mx-auto border-x border-slate-50 font-sans text-slate-900">
      
      <div className="bg-white/80 backdrop-blur-md z-30 border-b border-slate-50">
        <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push("/home")} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Activity</h1>
            </div>
            <button onClick={refetch} disabled={refreshing} className="p-2.5 bg-slate-50 rounded-xl active:scale-90 transition-all">
                <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? "animate-spin" : ""}`} />
            </button>
        </div>

        <div className="px-6 pb-4 space-y-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="search history..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium outline-none focus:bg-white focus:border-primary/20 transition-all"
                />
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {["ALL", "TRANSFER", "QR_PAYMENT", "SPLIT_BILL_SETTLEMENT"].map((f) => (
                    <button key={f} onClick={() => setActiveFilter(f)} className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all border ${activeFilter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200"}`}>
                        {f.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-white">
        {refreshing ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
            </div>
        ) : filteredTransactions.length > 0 ? (
            Object.entries(groupedTransactions).map(([date, txs]) => (
                <div key={date}>
                    <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-6 py-3 z-10 border-b border-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest">{date}</p>
                    </div>
                    <div className="px-4 py-2 space-y-2">
                        {txs.map((tx) => {
                            const isSent = tx.sender_phone === user?.phone_number || tx.type === 'PACKET_CREATE';
                            const config = TRANSACTION_CONFIG[tx.type.toLowerCase()] || TRANSACTION_CONFIG['transfer'];
                            const Icon = config.icon;

                            return (
                                <div 
                                    key={tx.id} 
                                    className="p-4 bg-white border border-slate-100 rounded-[1.8rem] flex items-center justify-between hover:border-primary/30 transition-all active:scale-[0.98] cursor-pointer group "
                                    onClick={() => window.open(`${NETWORK_CONFIG.blockExplorer}/tx/${tx.tx_hash}`, '_blank')}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.bgClass} ${config.textClass}`}>
                                            <Icon size={20} strokeWidth={2.5} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-slate-900 truncate">
                                                {isSent ? (tx.receiver_name || tx.receiver_phone || 'recipient') : (tx.sender_name || tx.sender_phone || 'sender')}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 tracking-tighter">
                                                {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {config.label}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className={`font-black text-sm tracking-tight ${isSent ? 'text-slate-900' : 'text-emerald-600'}`}>
                                                {isSent ? '-' : '+'} {tx.amount.toFixed(2)}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-300">usdc</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-primary hover:text-slate-900 transition-all shadow-sm">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
                <ReceiptIcon size={48} className="mb-4 text-slate-200" />
                <p className="text-[10px] font-bold tracking-widest">no activity</p>
            </div>
        )}
      </main>

      {selectedTx && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm space-y-6">
            <div ref={receiptRef} className="p-4 bg-transparent">
              <div className="relative bg-[#F9F9F9] text-slate-800 mx-auto w-[320px] shadow-2xl">
                
                <div className="absolute -top-3 left-0 w-full h-3" style={{ backgroundImage: `linear-gradient(-45deg, #F9F9F9 6px, transparent 0), linear-gradient(45deg, #F9F9F9 6px, transparent 0)`, backgroundSize: '12px 12px' }} />

                <div className="p-8 pt-10 pb-10 space-y-6 flex flex-col items-center">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center mb-2">
                      <Image src="/logo.png" alt="Saku" width={42} height={42} className="grayscale contrast-125" />
                    </div>
                    <h3 className="text-sm font-black tracking-[0.3em]">saku digital</h3>
                  </div>

                  <div className="w-full border-b border-dashed border-slate-300" />

                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">transaction amount</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl font-black tracking-tighter text-slate-900">{selectedTx.amount.toFixed(2)}</span>
                      <span className="text-lg font-bold text-slate-900">usdc</span>
                    </div>
                  </div>

                  <div className="w-full space-y-3 font-mono text-[10px]">
                    <div className="flex justify-between border-t border-slate-200 pt-3">
                      <span className="text-slate-400">type:</span>
                      <span className="font-bold">{selectedTx.type.replace(/_/g, ' ')}</span>
                    </div>
                    {selectedTx.description && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">memo:</span>
                            <span className="font-bold truncate ml-4 italic">"{selectedTx.description}"</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">date:</span>
                      <span className="font-bold">{new Date(selectedTx.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="w-full border-b border-dashed border-slate-200" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">ref no:</span>
                      <span className="font-bold truncate ml-4">#{selectedTx.tx_hash?.slice(0,12).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">counterparty:</span>
                      <span className="font-bold truncate ml-4">{(selectedTx.receiver_phone === user?.phone_number ? selectedTx.sender_phone : selectedTx.receiver_phone) || 'system'}</span>
                    </div>
                  </div>

                  <div className="w-full pt-4">
                    <div className="h-8 w-full bg-slate-900 flex gap-[1px] px-4 py-1.5 overflow-hidden">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="bg-white h-full" style={{ width: `${(i % 3) + 1}px`, opacity: i % 2 === 0 ? 1 : 0.7 }} />
                        ))}
                    </div>
                    <p className="text-[9px] font-black italic text-slate-400 tracking-widest text-center mt-4">--- thank you ---</p>
                  </div>
                </div>

                <div className="absolute -bottom-3 left-0 w-full h-3" style={{ backgroundImage: `linear-gradient(-45deg, transparent 6px, #F9F9F9 0), linear-gradient(45deg, transparent 6px, #F9F9F9 0)`, backgroundSize: '12px 12px' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4">
              <button onClick={downloadReceipt} disabled={isGenerating} className="col-span-2 py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all tracking-widest disabled:opacity-50">
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Download size={18} />} save receipt
              </button>
              <button onClick={() => setSelectedTx(null)} className="col-span-2 py-2 text-white/40 font-bold text-[10px] hover:text-white transition-colors tracking-widest text-center">
                close preview
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}
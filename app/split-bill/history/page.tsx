"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, ChevronRight, Search, Receipt } from "lucide-react"
import Header from "@/components/layout/Header"
import BottomNavigation from "@/components/home/bottom-navigation"

interface SplitHistory {
  id: string;
  description: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function AllHistoryPage() {
  const router = useRouter()
  
  const [history, setHistory] = useState<SplitHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchAllHistory = async () => {
      try {
        const token = localStorage.getItem('saku_auth_token')
        const res = await fetch('/api/split-bill/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await res.json()
        if (result.success) {
            setHistory(result.data)
        }
      } catch (err) {
        console.error("Gagal mengambil riwayat:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAllHistory()
  }, [])

  const filteredHistory = history.filter(h => 
    (h.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen h-dvh bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans overflow-x-hidden">
      <Header />
      
      <div className="p-6 space-y-8 flex-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-black/5 rounded-xl transition-all active:scale-90"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black italic tracking-tight leading-none">Full History</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
          <input 
            type="text"
            placeholder="Cari tagihan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/50 rounded-[2rem] pl-14 pr-8 py-5 font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10 transition-all"
          />
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <p className="animate-pulse font-bold italic text-black/20 tracking-widest text-[10px]">Loading your bills...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredHistory.map((bill) => (
              <div 
                key={bill.id} 
                onClick={() => router.push(`/split-bill/details/${bill.id}`)}
                className="p-6 bg-white border border-black/5 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="space-y-1">
                  <p className="font-bold text-sm italic capitalize">{bill.description || "Tanpa Deskripsi"}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-black/30 tracking-widest">
                    <Clock size={10}/>
                    <span>{new Date(bill.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-black text-sm tracking-tighter text-black/85">
                    Rp {Number(bill.total_amount).toLocaleString()}
                  </p>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                    bill.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {bill.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center opacity-20 grayscale flex flex-col items-center gap-4">
            <Receipt size={48} />
            <p className="text-[10px] font-bold tracking-[0.2em]">No matching bills found</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Search, Receipt, ChevronRight, Wallet } from "lucide-react"
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
        console.error("Failed to fetch history:", err)
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
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto border-x border-slate-50 font-sans pb-32">
      <Header />
      
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Navigation Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-slate-900">Bill History</h1>
            <p className="text-xs text-slate-500">Track all your split expenses.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-primary" />
          <input 
            type="text"
            placeholder="Search by occasion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-transparent rounded-2xl pl-11 pr-4 py-4 text-sm font-medium outline-none focus:bg-white focus:border-primary/20 transition-all"
          />
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
            <p className="text-[10px] font-bold text-slate-400 tracking-widest">Loading history...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredHistory.map((bill) => (
              <button 
                key={bill.id} 
                onClick={() => router.push(`/split-bill/details/${bill.id}`)}
                className="w-full p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm hover:border-primary/30"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${
                    bill.status === 'pending' ? "bg-amber-50 border-amber-100 text-amber-500" : "bg-emerald-50 border-emerald-100 text-emerald-500"
                  }`}>
                    <Receipt size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate lowercase">{bill.description || "untitled bill"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 tracking-tight">
                        {new Date(bill.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className={`text-[9px] font-black tracking-widest ${
                        bill.status === 'pending' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-baseline gap-1">
                    <p className="font-bold text-base text-slate-900 tracking-tight">
                      {Number(bill.total_amount).toFixed(2)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">usdc</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <Receipt size={24} className="text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">No history found</p>
              <p className="text-xs text-slate-400">You haven't split any bills yet.</p>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}

function Loader2({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`animate-spin ${className}`}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
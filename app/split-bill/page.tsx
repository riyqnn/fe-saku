"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Receipt, Camera, Plus, Trash2, Search, UserPlus, Send, Check, Minus, 
  Loader2, Sparkles, Clock, ChevronRight, History
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import BottomNavigation from "@/components/home/bottom-navigation"

interface Member { phone_number: string; full_name: string; }
interface BillItem { id: string; name: string; price: number; qty: number; }
interface SplitHistory { id: string; description: string; total_amount: number; status: string; created_at: string; }

export default function SplitBillPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [description, setDescription] = useState("")
  const [tax, setTax] = useState("0")
  const [discount, setDiscount] = useState("0")
  const [items, setItems] = useState<BillItem[]>([{ id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMemberPhone, setSelectedMemberPhone] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<SplitHistory[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && members.length === 0) {
      setMembers([{ phone_number: user.phone_number, full_name: "Me (You)" }])
      setSelectedMemberPhone(user.phone_number)
    }
    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/split-bill/history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('saku_auth_token')}`
            }
            });
            const result = await res.json();
            if (result.success) {
            setHistory(result.data);
            }
        } catch (err) {
            console.error("Gagal ambil history:", err);
        }
        };
    fetchHistory()
  }, [user])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        const res = await fetch(`/api/profile/search?query=${searchQuery}`) 
        const data = await res.json()
        if (data.success) {
          setSearchResults(data.profiles.filter((p: Member) => !members.find(m => m.phone_number === p.phone_number)))
        }
      } else { setSearchResults([]) }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, members])

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsOcrLoading(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: reader.result }),
        })
        const data = await res.json()
        if (data.success) {
          if (data.description) setDescription(data.description)
          setItems(data.items.map((i: any) => ({ ...i, id: Math.random().toString(36).substring(2, 9) })))
          setTax(data.totalTax?.toString() || "0")
          setDiscount(data.totalDiscount?.toString() || "0")
          toast.success("Receipt scanned! ✨")
        }
      } catch (err) { toast.error("OCR failed") } finally { setIsOcrLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleSplitSubmit = async () => {
    if (!description) return toast.error("Please add a description")
    setIsSubmitting(true)
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0)
    const grandTotal = subtotal + Number(tax) - Number(discount)

    toast.promise(
      fetch('/api/split-bill/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorPhone: user?.phone_number,
          description,
          totalTax: Number(tax),
          totalDiscount: Number(discount),
          items: items.map(item => ({
            ...item,
            assignedTo: members.filter(m => assignments[m.phone_number]?.includes(item.id)).map(m => m.phone_number)
          }))
        })
      }).then(res => res.ok ? res.json() : Promise.reject()),
      {
        loading: 'Dispatching split bill...',
        success: () => { router.push('/home'); return `Bill Rp ${grandTotal.toLocaleString()} dispatched!` },
        error: () => { setIsSubmitting(false); return 'Failed to create bill' }
      }
    )
  }

  return (
    <div className="min-h-screen h-dvh bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <Header />
      
      <div className="p-5 space-y-8 animate-in fade-in duration-500">
        {/* Mobile Header Title */}
        <div className="space-y-1">
            <h1 className="text-4xl font-black italic tracking-tighter leading-none">SPLIT<br/>BILL</h1>
            <div className="h-1 w-12 bg-primary rounded-full" />
        </div>

        {/* Occasion Card */}
        <section className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 border border-primary/20 space-y-6 shadow-xl shadow-primary/20">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-amber-900/60 tracking-widest ml-1">The Occasion</p>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Merchant / Dinner name..."
              className="w-full bg-transparent text-2xl font-bold italic outline-none placeholder:text-black/20 text-black/85"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-white/30 rounded-2xl border border-white/20">
                <p className="text-[8px] font-bold text-amber-900/60 mb-1">Tax (Rp)</p>
                <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none text-amber-900" />
             </div>
             <div className="p-4 bg-white/30 rounded-2xl border border-white/20">
                <p className="text-[8px] font-bold text-amber-900/60 mb-1">Discount (Rp)</p>
                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-transparent font-bold text-sm outline-none text-amber-900" />
             </div>
          </div>
        </section>

        {/* Menu Items Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <div>
                <h3 className="text-sm font-black italic">1. Order List</h3>
                <p className="text-[10px] font-bold text-black/30 tracking-tighter">Add items or scan receipt</p>
            </div>
            <div className="flex gap-2">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleScanReceipt} />
              <button 
                onClick={() => cameraInputRef.current?.click()} 
                className="p-3 bg-black text-primary rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                {isOcrLoading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <button onClick={() => setItems([...items, { id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])} className="p-3 bg-primary text-black rounded-2xl shadow-xl">
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col p-4 bg-muted/40 rounded-[2rem] border border-transparent focus-within:border-primary/30 transition-all space-y-3">
                <div className="flex gap-3">
                    <input 
                        placeholder="Item name..." 
                        value={item.name} 
                        onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} 
                        className="flex-1 bg-transparent font-bold text-sm outline-none" 
                    />
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-black/10 hover:text-red-500 transition-colors">
                        <Trash2 size={16}/>
                    </button>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center bg-black/5 rounded-full p-1">
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-90 transition-all"><Minus size={12}/></button>
                        <span className="w-10 text-center text-xs font-black">{item.qty}</span>
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-90 transition-all"><Plus size={12}/></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-black/20 italic">Rp</span>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={item.price || ""} 
                            onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} 
                            className="w-24 bg-transparent font-black text-right outline-none text-sm" 
                        />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Squad Selection */}
        <section className="space-y-5">
          <div className="px-2">
            <h3 className="text-sm font-black italic">2. The Squad</h3>
            <p className="text-[10px] font-bold text-black/30 tracking-tighter">Who's paying for what?</p>
          </div>
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
            <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Find Saku friends..." 
                className="w-full bg-muted/50 rounded-[2rem] pl-14 pr-8 py-5 font-bold text-sm outline-none focus:bg-white transition-all border-2 border-transparent focus:border-primary/10" 
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-primary/10 rounded-[2.5rem] shadow-2xl z-30 p-4 space-y-2">
                {searchResults.map(p => (
                  <button key={p.phone_number} onClick={() => { setMembers([...members, p]); setSearchQuery(""); setSearchResults([]); setSelectedMemberPhone(p.phone_number); }} className="w-full text-left p-4 hover:bg-primary/5 rounded-[1.5rem] flex justify-between items-center transition-all group">
                    <span className="font-bold text-sm">{p.full_name}</span>
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary transition-all">
                        <UserPlus size={14} className="text-primary group-hover:text-black" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
            {members.map(m => (
              <button 
                key={m.phone_number} 
                onClick={() => setSelectedMemberPhone(m.phone_number)} 
                className={`flex-shrink-0 px-6 py-3 rounded-full font-black text-[10px] tracking-widest transition-all ${selectedMemberPhone === m.phone_number ? "bg-black text-white shadow-lg scale-105" : "bg-muted text-black/40"}`}
              >
                {m.full_name} ({assignments[m.phone_number]?.length || 0})
              </button>
            ))}
          </div>
        </section>

        {/* Item Assignment Grid */}
        {selectedMemberPhone && (
          <section className="space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-2 justify-center py-2 px-6 bg-primary/10 rounded-full w-fit mx-auto border border-primary/20">
                <Sparkles size={12} className="text-amber-900" />
                <p className="text-[9px] font-black text-amber-900 tracking-widest">Select for {members.find(m => m.phone_number === selectedMemberPhone)?.full_name}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {items.filter(i => i.name).map(item => {
                const isSelected = assignments[selectedMemberPhone]?.includes(item.id)
                return (
                  <button 
                    key={item.id} 
                    onClick={() => {
                      setAssignments(prev => {
                        const cur = prev[selectedMemberPhone] || []
                        return { ...prev, [selectedMemberPhone]: cur.includes(item.id) ? cur.filter(id => id !== item.id) : [...cur, item.id] }
                      })
                    }}
                    className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all active:scale-[0.98] ${isSelected ? "bg-white border-primary shadow-xl" : "bg-muted/30 border-transparent grayscale opacity-50"}`}
                  >
                    <div className="text-left">
                        <p className="font-black text-sm italic">{item.qty}x {item.name}</p>
                        <p className="text-[10px] font-bold text-black/30 tracking-widest">Rp {(item.price * item.qty).toLocaleString()}</p>
                    </div>
                    {isSelected ? <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg"><Check size={20} strokeWidth={4}/></div> : <Plus size={20} className="text-black/10" />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Submit Button (NON-STICKY) */}
        <div className="pt-10">
            <button
                onClick={handleSplitSubmit}
                disabled={isSubmitting}
                className="w-full py-6 rounded-[3rem] bg-primary text-black font-bold tracking-[0.2em] shadow-xl shadow-primary/30 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 transition-all"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} className="-rotate-45" />}
                Dispatch Bill
            </button>
        </div>

        <section className="pt-10 space-y-6 pb-20 border-t border-black/5">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                    <History size={18} className="text-primary" />
                    <h3 className="text-lg font-black italic">Bill History</h3>
                </div>
                {/* Tombol See All sekarang arahkan ke halaman baru */}
                <button 
                  onClick={() => router.push('/split-bill/history')}
                  className="text-[10px] font-bold text-black/30 tracking-widest hover:text-primary transition-colors"
                >
                  See All
                </button>
            </div>

            {history.length > 0 ? (
                <div className="space-y-4">
                    {history.slice(0, 5).map(bill => (
                        <div 
                            key={bill.id} 
                            onClick={() => router.push(`/split-bill/details/${bill.id}`)}
                            className="p-6 bg-white border border-black/5 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] active:bg-muted/50 transition-all cursor-pointer"
                        >
                            <div className="space-y-1">
                                <p className="font-bold text-sm italic">{bill.description}</p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-black/30 tracking-widest">
                                    <Clock size={10}/>
                                    <span>{new Date(bill.created_at).toLocaleDateString()}</span>
                                    <span className={`px-2 py-0.5 rounded-full ${bill.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {bill.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="font-black text-sm tracking-tighter">Rp {bill.total_amount.toLocaleString()}</p>
                                <ChevronRight size={16} className="text-black/10 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center space-y-4 opacity-20 grayscale">
                    <Receipt size={48} className="mx-auto" />
                    <p className="text-[10px] font-bold tracking-widest">No history found</p>
                </div>
            )}
        </section>
      </div>

      <BottomNavigation />
    </div>
  )
}
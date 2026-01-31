"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Receipt, Plus, Trash2, Search, UserPlus, Send, Check, Minus, Loader2, Sparkles
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import BottomNavigation from "@/components/home/bottom-navigation"

interface Member { phone_number: string; full_name: string; }
interface BillItem { id: string; name: string; price: number; qty: number; }

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && members.length === 0) {
      setMembers([{ phone_number: user.phone_number, full_name: "Me (You)" }])
      setSelectedMemberPhone(user.phone_number)
    }
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
        success: () => { router.push('/home'); return `Bill IDR ${grandTotal.toLocaleString()} created!` },
        error: () => { setIsSubmitting(false); return 'Failed to create bill' }
      }
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <Header />
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
            <h1 className="text-3xl font-black italic tracking-tighter">Split Bill</h1>
            <p className="text-xs font-bold text-black/30 uppercase tracking-widest">Share the cost, keep the peace</p>
        </div>

        <section className="p-8 rounded-[3rem] bg-primary/5 border border-primary/20 space-y-4">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the occasion?" className="w-full bg-transparent text-2xl font-bold italic outline-none" />
          <div className="flex gap-4">
             <div className="flex-1">
                <p className="text-[8px] font-bold text-black/40 uppercase">Tax (IDR)</p>
                <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 font-bold" />
             </div>
             <div className="flex-1">
                <p className="text-[8px] font-bold text-black/40 uppercase">Discount (IDR)</p>
                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 font-bold" />
             </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-bold text-black/40 tracking-widest uppercase italic">1. Menu List</h3>
            <div className="flex gap-2">
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-black text-primary rounded-xl flex items-center gap-2 shadow-lg">
                {isOcrLoading ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                <span className="text-[10px] font-bold uppercase">Scan</span>
              </button>
              <button onClick={() => setItems([...items, { id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])} className="p-2.5 bg-primary text-black rounded-xl shadow-lg">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-3 px-1">
            {items.map((item) => (
              <div key={item.id} className="flex gap-2 items-center">
                <input placeholder="Item..." value={item.name} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} className="flex-1 bg-muted/50 rounded-[1.5rem] px-4 py-4 font-semibold text-xs outline-none focus:bg-white" />
                <div className="flex items-center bg-muted/50 rounded-[1.5rem] px-2 h-full">
                    <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="p-1"><Minus size={12}/></button>
                    <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                    <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="p-1"><Plus size={12}/></button>
                </div>
                <input type="number" placeholder="Price" value={item.price || ""} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} className="w-20 bg-muted/50 rounded-[1.5rem] px-3 py-4 font-semibold text-xs outline-none" />
                <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-black/20 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <h3 className="text-[10px] font-bold text-black/40 tracking-widest uppercase italic px-4">2. The Squad</h3>
          <div className="relative px-2">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find friends..." className="w-full bg-muted/50 rounded-[2rem] pl-14 pr-8 py-5 font-semibold text-sm outline-none" />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-2 right-2 mt-3 bg-white border rounded-[2.5rem] shadow-2xl z-30 p-3 animate-in zoom-in-95">
                {searchResults.map(p => (
                  <button key={p.phone_number} onClick={() => { setMembers([...members, p]); setSearchQuery(""); setSearchResults([]); setSelectedMemberPhone(p.phone_number); }} className="w-full text-left p-4 hover:bg-primary/10 rounded-[1.8rem] flex justify-between items-center">
                    <span className="font-semibold text-sm italic">{p.full_name}</span>
                    <UserPlus size={16} className="text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 px-4">
            {members.map(m => (
              <button key={m.phone_number} onClick={() => setSelectedMemberPhone(m.phone_number)} className={`px-4 py-2.5 rounded-full font-bold text-[10px] uppercase transition-all ${selectedMemberPhone === m.phone_number ? "bg-black text-white" : "bg-muted text-black/40"}`}>
                {m.full_name} ({assignments[m.phone_number]?.length || 0})
              </button>
            ))}
          </div>
        </section>

        {selectedMemberPhone && (
          <section className="space-y-4 animate-in fade-in duration-500 pb-10">
            <p className="text-[10px] font-bold text-center italic text-amber-900 bg-primary/20 py-2 rounded-full w-fit mx-auto px-6 uppercase tracking-widest">Assigning Items</p>
            <div className="grid grid-cols-1 gap-3 px-2">
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
                    className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all ${isSelected ? "bg-white border-primary shadow-xl" : "bg-white border-black/5 opacity-60"}`}
                  >
                    <div className="text-left">
                        <p className="font-bold text-sm italic">{item.qty}x {item.name}</p>
                        <p className="text-[10px] font-bold text-black/30">IDR {(item.price * item.qty).toLocaleString()}</p>
                    </div>
                    {isSelected ? <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"><Check size={18} strokeWidth={4}/></div> : <Plus size={20} className="text-black/10" />}
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-lg mx-auto p-6 transition-all duration-500 z-30">
        <button onClick={handleSplitSubmit} disabled={isSubmitting} className="w-full py-6 rounded-[3rem] bg-primary text-black font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30">
          {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} 
          Dispatch Split Session
        </button>
      </div>
      <BottomNavigation />
    </div>
  )
}
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Receipt, Camera, Plus, Trash2, Search, UserPlus, Send, Check, Minus, 
  Loader2, Sparkles, Clock, ChevronRight, History, Wallet
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
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && members.length === 0) {
      setMembers([{ phone_number: user.phone_number, full_name: "me (you)" }])
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
          if (data.description) setDescription(data.description)
          setItems(data.items.map((i: any) => ({ ...i, id: Math.random().toString(36).substring(2, 9) })))
          setTax(data.totalTax?.toString() || "0")
          setDiscount(data.totalDiscount?.toString() || "0")
          toast.success("receipt scanned! ✨")
        }
      } catch (err) { toast.error("ocr failed") } finally { setIsOcrLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleSplitSubmit = async () => {
      // Validasi dasar
      if (!description.trim()) return toast.error("please add a description for the occasion");
      if (items.filter(i => i.name).length === 0) return toast.error("please add at least one item");
      
      // Validasi apakah sudah ada item yang di-assign
      const totalAssignments = Object.values(assignments).flat().length;
      if (totalAssignments === 0) return toast.error("please assign items to at least one person");

      setIsSubmitting(true);

      const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const grandTotal = subtotal + Number(tax) - Number(discount);

      try {
        // Kita pakai toast manual biar lebih terkontrol kenapa dia gagal
        const loadingToast = toast.loading("dispatching your bill to the squad...");

        const response = await fetch('/api/split-bill/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('saku_auth_token')}` // Pastikan token ada
          },
          body: JSON.stringify({
            creatorPhone: user?.phone_number,
            description,
            totalTax: Number(tax),
            totalDiscount: Number(discount),
            items: items.filter(i => i.name).map(item => ({
              ...item,
              assignedTo: members.filter(m => assignments[m.phone_number]?.includes(item.id)).map(m => m.phone_number)
            }))
          })
        });

        const result = await response.json();

        if (result.success) {
          toast.success(`bill ${grandTotal.toFixed(2)} usdc dispatched!`, { id: loadingToast });
          router.push('/home');
        } else {
          throw new Error(result.error || "failed to create bill");
        }
      } catch (err: any) {
        toast.error(err.message || "something went wrong", { id: "dispatch-error" });
        setIsSubmitting(false);
      }
    };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto border-x border-slate-100 font-sans pb-32">
      <Header />
      
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Split Bill</h1>
                <p className="text-xs text-slate-500">divide the costs, keep the vibes.</p>
            </div>
            <button 
                onClick={() => router.push('/split-bill/history')}
                className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors"
            >
                <History size={20} />
            </button>
        </div>

        <section className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">occasion</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. dinner at kintan..."
              className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-slate-300 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">tax (usdc)</p>
                <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-primary transition-all" />
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">discount</p>
                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-white p-3 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-primary transition-all" />
             </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-slate-900">1. order list</h3>
            <div className="flex gap-2">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleScanReceipt} />
              <button 
                onClick={() => cameraInputRef.current?.click()} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-sm"
              >
                {isOcrLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                scan
              </button>
              <button 
                onClick={() => setItems([...items, { id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])}
                className="p-2 bg-primary text-slate-900 rounded-xl active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all space-y-4 shadow-sm">
                <div className="flex gap-3">
                    <input 
                        placeholder="item name..." 
                        value={item.name} 
                        onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} 
                        className="flex-1 bg-transparent font-semibold text-sm outline-none text-slate-900" 
                    />
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={16}/>
                    </button>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center bg-slate-50 rounded-lg p-1">
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-100 shadow-sm"><Minus size={10}/></button>
                        <span className="w-8 text-center text-xs font-bold text-slate-700">{item.qty}</span>
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-100 shadow-sm"><Plus size={10}/></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">usdc</span>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={item.price || ""} 
                            onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} 
                            className="w-20 bg-transparent font-bold text-right outline-none text-sm text-slate-900" 
                        />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="px-1">

            <h3 className="text-sm font-bold text-slate-900">2. The Squad</h3>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="search friends..." 
                className="w-full bg-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium outline-none border border-transparent focus:border-primary/30 focus:bg-white transition-all" 
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 p-2 space-y-1">
                {searchResults.map(p => (
                  <button key={p.phone_number} onClick={() => { setMembers([...members, p]); setSearchQuery(""); setSearchResults([]); setSelectedMemberPhone(p.phone_number); }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex justify-between items-center transition-all group">
                    <span className="font-semibold text-sm text-slate-700">{p.full_name}</span>
                    <UserPlus size={14} className="text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
            {members.map(m => (
              <button 
                key={m.phone_number} 
                onClick={() => setSelectedMemberPhone(m.phone_number)} 
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-[11px] transition-all border ${
                    selectedMemberPhone === m.phone_number 
                    ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {m.full_name.toLowerCase()} · {assignments[m.phone_number]?.length || 0}
              </button>
            ))}
          </div>
        </section>

        {selectedMemberPhone && (
          <section className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 px-1">
                <Sparkles size={14} className="text-secondary" />
                <p className="text-[11px] font-bold text-slate-500">assigning for {members.find(m => m.phone_number === selectedMemberPhone)?.full_name.toLowerCase()}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
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
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                        isSelected 
                        ? "bg-white border-primary shadow-sm" 
                        : "bg-slate-50/50 border-transparent opacity-60"
                    }`}
                  >
                    <div className="text-left">
                        <p className="font-bold text-sm text-slate-800">{item.qty}x {item.name.toLowerCase()}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{(item.price * item.qty).toFixed(2)} USDC</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-primary text-slate-900 scale-110" : "bg-slate-200 text-transparent"}`}>
                        <Check size={14} strokeWidth={3}/>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Tambahkan padding ekstra sebelum tombol agar tidak tertutup BottomNav */}
        <div className="pt-10 pb-10"> 
            <button
                type="button" // Pakai type button eksplisit
                onClick={(e) => {
                    e.preventDefault();
                    handleSplitSubmit();
                }}
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-[0.95] disabled:opacity-30 transition-all cursor-pointer relative z-10"
            >
                {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18}/>
                ) : (
                    <>
                        <Send size={16} className="-rotate-12" />
                        <span>dispatch split bill</span>
                    </>
                )}
            </button>
            
            {/* Helper text tipis di bawah tombol */}
            <p className="text-[10px] text-center text-slate-400 mt-4 italic">
                all members will be notified instantly
            </p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
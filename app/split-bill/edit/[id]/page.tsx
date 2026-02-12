"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, Trash2, Search, UserPlus, Send, Check, Minus, 
  Loader2, Sparkles, ArrowLeft, AlertCircle, XCircle
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"
import Header from "@/components/layout/Header"
import BottomNavigation from "@/components/home/bottom-navigation"
import { hashPhoneNumber } from "@/utils/phoneHash"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Member { 
  phone_number: string; 
  full_name: string; 
  is_rejected?: boolean; 
  rejection_reason?: string; 
}
interface BillItem { 
  id: string; 
  name: string; 
  price: number; 
  qty: number; 
  status?: string; 
  reason?: string; 
}

export default function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const billId = resolvedParams.id
  const router = useRouter()
  const { user } = useAuth()
  
  const [description, setDescription] = useState("")
  const [tax, setTax] = useState("0")
  const [discount, setDiscount] = useState("0")
  const [items, setItems] = useState<BillItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMemberPhone, setSelectedMemberPhone] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchBillData = async () => {
      if (!user || !billId) return
      try {
        setLoading(true)
        const { data: bill, error: billErr } = await supabase
          .from('split_bills')
          .select('*, split_bill_items(*)')
          .eq('id', billId)
          .single()

        if (billErr) throw billErr

        setDescription(bill.description)
        setTax(bill.tax_amount.toString())
        setDiscount(bill.discount_amount.toString())

        const uniqueHashes = [...new Set(bill.split_bill_items.map((i: any) => i.debtor_phone_hash))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('phone_number, full_name, phone_hash')
          .in('phone_hash', uniqueHashes)

        const memberList: Member[] = [{ phone_number: user.phone_number, full_name: "me (you)" }]
        const assignmentMap: Record<string, string[]> = { [user.phone_number]: [] }
        const itemsList: BillItem[] = []

        bill.split_bill_items.forEach((dbItem: any) => {
          const profile = profiles?.find(p => p.phone_hash === dbItem.debtor_phone_hash)
          const phone = profile?.phone_number || dbItem.debtor_phone_hash
          
          // Cek apakah member ini pernah menolak
          const isRejected = dbItem.status === 'rejected'
          
          let existingMember = memberList.find(m => m.phone_number === phone)
          if (!existingMember) {
            memberList.push({ 
              phone_number: phone, 
              full_name: profile?.full_name || phone,
              is_rejected: isRejected,
              rejection_reason: dbItem.rejection_reason 
            })
          } else if (isRejected) {
              // Jika satu item ditolak, tandai member sebagai penolak
              existingMember.is_rejected = true
              existingMember.rejection_reason = dbItem.rejection_reason
          }

          if (!assignmentMap[phone]) assignmentMap[phone] = []
          
          let existingUIItem = itemsList.find(i => i.name === dbItem.item_name)
          if (!existingUIItem) {
            const newId = Math.random().toString(36).substring(2, 9)
            itemsList.push({
              id: newId,
              name: dbItem.item_name,
              price: dbItem.amount,
              qty: 1,
              status: dbItem.status,
              reason: dbItem.rejection_reason
            })
            assignmentMap[phone].push(newId)
          } else {
            assignmentMap[phone].push(existingUIItem.id)
          }
        })

        setItems(itemsList)
        setMembers(memberList)
        setAssignments(assignmentMap)
        setSelectedMemberPhone(user.phone_number)
      } catch (err) {
        toast.error("failed to load bill")
      } finally {
        setLoading(false)
      }
    }
    fetchBillData()
  }, [billId, user])

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

  const handleUpdateSubmit = async () => {
    if (!description.trim()) return toast.error("description required")
    setIsSubmitting(true)
    const loadingToast = toast.loading("re-dispatching split bill...")

    try {
      const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0)
      const netAdjustment = Number(tax) - Number(discount)
      const grandTotal = subtotal + netAdjustment

      await supabase.from('split_bills').update({
        description,
        total_amount: grandTotal,
        tax_amount: Number(tax),
        discount_amount: Number(discount),
        status: 'pending'
      }).eq('id', billId)

      await supabase.from('split_bill_items').delete().eq('bill_id', billId)

      const itemsToInsert: any[] = []
      items.forEach(item => {
        const eaters = members.filter(m => assignments[m.phone_number]?.includes(item.id))
        if (eaters.length > 0) {
          const pricePerPerson = (item.price * item.qty) / eaters.length
          eaters.forEach(eater => {
            itemsToInsert.push({
              bill_id: billId,
              debtor_phone_hash: hashPhoneNumber(eater.phone_number),
              item_name: item.name,
              amount: pricePerPerson,
              status: 'pending',
              is_paid: eater.phone_number === user?.phone_number
            })
          })
        }
      })

      const { error: insertErr } = await supabase.from('split_bill_items').insert(itemsToInsert)
      if (insertErr) throw insertErr

      toast.success("bill updated and split correctly!", { id: loadingToast })
      router.push('/home')
    } catch (err) {
      toast.error("update failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-200" /></div>

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto border-x border-slate-100 font-sans pb-32">
      <Header />
      
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div className="space-y-0.5">
                <h1 className="text-xl font-bold text-slate-900">Edit Split Bill</h1>
                <p className="text-xs text-slate-500">fix assignments and re-dispatch.</p>
            </div>
        </div>

        {/* TOP FEEDBACK BANNER */}
        {members.some(m => m.is_rejected) && (
            <div className="p-5 bg-red-50 border border-red-100 rounded-3xl space-y-3 shadow-sm shadow-red-100/50">
                <div className="flex items-center gap-2 text-red-600">
                    <XCircle size={16} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Rejection Feedback</p>
                </div>
                <div className="space-y-2">
                    {members.filter(m => m.is_rejected).map((m, idx) => (
                        <div key={idx} className="text-xs">
                            <span className="font-bold text-red-900">{m.full_name.toLowerCase()}</span>: <span className="text-red-700 italic">"{m.rejection_reason || "no reason given"}"</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* OCCASION CARD */}
        <section className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">occasion</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent text-xl font-semibold outline-none text-slate-900" />
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

        {/* ORDER LIST */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-slate-900">1. order list</h3>
            <button onClick={() => setItems([...items, { id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])} className="p-2 bg-primary text-slate-900 rounded-xl hover:shadow-lg transition-all"><Plus size={20} /></button>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:border-slate-200 transition-all">
                <div className="flex gap-3">
                    <input placeholder="item name..." value={item.name} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} className="flex-1 bg-transparent font-semibold text-sm outline-none text-slate-900" />
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-400"><Trash2 size={16}/></button>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center justify-center bg-slate-50 rounded-lg p-1">
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-100 rounded-md active:scale-90 transition-transform"><Minus size={10} /></button>
                        <span className="w-8 text-center text-xs font-bold text-slate-700">{item.qty}</span>
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-100 rounded-md active:scale-90 transition-transform"><Plus size={10} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">usdc</span>
                        <input type="number" value={item.price || ""} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} className="w-20 bg-transparent font-bold text-right outline-none text-sm text-slate-900" />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SQUAD SECTION */}
        <section className="space-y-4">
          <div className="px-1"><h3 className="text-sm font-bold text-slate-900">2. the squad</h3></div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="search friends..." className="w-full bg-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium outline-none border border-transparent focus:border-primary/30 transition-all shadow-inner" />
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
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-[11px] transition-all border flex items-center gap-2 ${
                    selectedMemberPhone === m.phone_number 
                    ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105" 
                    : m.is_rejected 
                    ? "bg-red-50 text-red-500 border-red-200" 
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {m.full_name.toLowerCase()} · {assignments[m.phone_number]?.length || 0}
                {m.is_rejected && <AlertCircle size={10} />}
              </button>
            ))}
          </div>
        </section>

        {/* ASSIGNMENT GRID */}
        {selectedMemberPhone && (
          <section className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 px-1">
                <Sparkles size={14} className="text-secondary" />
                <p className="text-[11px] font-bold text-slate-500 italic">
                  assigning for {members.find(m => m.phone_number === selectedMemberPhone)?.full_name.toLowerCase()}
                </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {items.filter(i => i.name).map(item => {
                const eatersCount = Object.values(assignments).filter(assignedIds => assignedIds.includes(item.id)).length
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
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${isSelected ? "bg-white border-primary shadow-sm" : "bg-slate-50/50 border-transparent opacity-60"}`}
                  >
                    <div className="text-left min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-800 truncate">{item.qty}x {item.name.toLowerCase()}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                          {eatersCount > 0 ? `(${(item.price * item.qty / (isSelected ? eatersCount : eatersCount + 1)).toFixed(2)} each)` : `${(item.price * item.qty).toFixed(2)} total`}
                        </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-primary text-slate-900 scale-110 shadow-sm" : "bg-slate-200 text-transparent"}`}>
                        <Check size={14} strokeWidth={3}/>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <div className="pt-6 pb-12 px-1">
            <button
                type="button"
                onClick={handleUpdateSubmit}
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 transition-all"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <><Send size={16} className="-rotate-12" /><span>update split bill</span></>}
            </button>
        </div>
      </div>
      <BottomNavigation />
    </div>
  )
}
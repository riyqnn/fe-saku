"use client"

import { useState, useEffect, use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, Loader2, Wallet, Info, CheckCircle2, 
  Clock, Users, PartyPopper, XCircle, Edit3, ChevronRight,
  Receipt, User, ListFilter
} from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { hashPhoneNumber } from "@/utils/phoneHash"
import { useSakuTransfer } from "@/hooks/useSakuTransfer" 
import { toast } from "sonner"
import SuccessStep from "@/components/transfer/steps/success-step"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type TabType = "pay" | "details"

export default function BillDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const { user } = useAuth()
  
  const { transferByPhone, loading: isPayingOnChain } = useSakuTransfer()

  const [activeTab, setActiveTab] = useState<TabType>("pay")
  const [bill, setBill] = useState<any>(null)
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [allBillItems, setAllBillItems] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [creatorName, setCreatorName] = useState<string | null>(null);

  const myHash = useMemo(() => user?.phone_number ? hashPhoneNumber(user.phone_number) : "", [user])
  const isCreator = bill?.creator_id === user?.phone_number

  const fetchDetails = async () => {
    if (!user?.phone_number || !id) return
    try {
      const { data: header } = await supabase.from('split_bills').select('*').eq('id', id).single()
      if (!header) return
      setBill(header)

      const { data: allItems } = await supabase.from('split_bill_items').select('*').eq('bill_id', id)
      setAllBillItems(allItems || [])

      const uniqueHashes = [...new Set((allItems || []).map(i => i.debtor_phone_hash))]
      const { data: profs } = await supabase.from('profiles').select('phone_hash, full_name').in('phone_hash', uniqueHashes)
      
      const profMap: Record<string, string> = {}
      profs?.forEach(p => { profMap[p.phone_hash] = p.full_name })
      setProfiles(profMap)

    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [user, id])

  // --- CALCULATIONS ---
  const groupedFullItems = useMemo(() => {
    return allBillItems.reduce((acc: any[], item) => {
      const existing = acc.find(i => i.item_name === item.item_name)
      if (existing) {
        existing.eaters.push(item.debtor_phone_hash)
        existing.total_item_price += item.amount
      } else {
        acc.push({ item_name: item.item_name, total_item_price: item.amount, eaters: [item.debtor_phone_hash] })
      }
      return acc;
    }, [])
  }, [allBillItems])

  const myItems = allBillItems.filter(i => i.debtor_phone_hash === myHash)
  const myPendingItems = myItems.filter(i => i.status !== 'paid' && i.status !== 'rejected')
  
  const mySubtotal = myItems.reduce((acc, i) => acc + i.amount, 0)
  
  // Perhitungan Pajak & Diskon Proporsional
  const subtotalMeja = useMemo(() => bill ? bill.total_amount - bill.tax_amount + bill.discount_amount : 0, [bill])
  const myTaxShare = useMemo(() => subtotalMeja > 0 ? (mySubtotal / subtotalMeja) * bill.tax_amount : 0, [mySubtotal, subtotalMeja, bill])
  const myDiscountShare = useMemo(() => subtotalMeja > 0 ? (mySubtotal / subtotalMeja) * bill.discount_amount : 0, [mySubtotal, subtotalMeja, bill])

  // FINAL TOTAL YANG HARUS DIBAYAR (Netto)
  const myFinalTotal = useMemo(() => mySubtotal + myTaxShare - myDiscountShare, [mySubtotal, myTaxShare, myDiscountShare])
  const myTotalToPay = myPendingItems.length > 0 ? myFinalTotal : 0

  const isAlreadyRejected = myItems.some(i => i.status === 'rejected')
  const progressPercent = allBillItems.length > 0 ? (allBillItems.filter(i => i.status === 'paid').length / allBillItems.length) * 100 : 0

  // --- ACTIONS ---
  const handleSettlement = async () => {
    if (!bill || myTotalToPay <= 0) return

    toast.promise(
      (async () => {
        const result = await transferByPhone({
          receiverPhone: bill.creator_id,
          amount: myTotalToPay.toString()
        })

        if (!result.success) throw new Error(result.error || "Payment failed")

        const { error: updateError } = await supabase
          .from('split_bill_items')
          .update({ status: 'paid', is_paid: true })
          .eq('bill_id', id)
          .eq('debtor_phone_hash', myHash)

        if (updateError) throw updateError

        const { data: latestItems } = await supabase.from('split_bill_items').select('status').eq('bill_id', id)
        if (latestItems?.every(item => item.status === 'paid')) {
          await supabase.from('split_bills').update({ status: 'paid' }).eq('id', id)
        }

        setIsSuccess(true)
        setTimeout(() => router.push('/home'), 3000)
        return result
      })(),
      {
        loading: 'Authorizing blockchain transaction...',
        success: 'USDC Sent Successfully! 💸',
        error: (err) => `Payment Error: ${err.message}`
      }
    )
  }

  const handleReject = async () => {
    const reasons = ["This isn't my bill", "Items are incorrect", "Amount is wrong", "Other"]
    const reasonIndex = window.prompt(`Why are you declining?\n` + reasons.map((r, i) => `${i + 1}. ${r}`).join("\n"))
    if (reasonIndex === null) return
    
    setIsRejecting(true)
    try {
      await fetch('/api/split-bill/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: id, phoneHash: myHash, reason: reasons[parseInt(reasonIndex)-1] || "Other" })
      })
      toast.success("Bill portion declined")
      router.push('/home')
    } catch (err) {
      setIsRejecting(false)
    }
  }

  if (fetching) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-6 h-6 animate-spin text-slate-200" /></div>

  if (isSuccess) {
    return (
      <SuccessStep
        txHash={null} 
        receiverName={creatorName || "Creator"}
        receiverPhone={bill?.creator_id || ""}
        amount={myFinalTotal.toString()}
        billDescription={bill?.description || "Split Bill"}
        onComplete={() => router.push('/home')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto border-x border-slate-50 font-sans pb-32">
      <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b border-slate-50">
        <button onClick={() => router.back()} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-900 uppercase tracking-widest text-center">Bill Details</h1>
        <div className="w-10" /> 
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <section className={`p-8 rounded-[2.5rem] border transition-all ${isCreator ? "bg-slate-900 border-slate-800 shadow-xl" : "bg-primary/10 border-primary/20"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isCreator ? "text-slate-400" : "text-primary"}`}>
                  {isCreator ? "Collection Progress" : "Your Total Share"}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-4xl font-bold tracking-tight ${isCreator ? "text-white" : "text-slate-900"}`}>
                      {/* Tampilkan MyFinalTotal yang sudah kena Tax & Discount */}
                      {isCreator ? `${Math.round(progressPercent)}%` : myFinalTotal.toFixed(2)}
                  </span>
                  {!isCreator && <span className="text-sm font-bold text-slate-400 uppercase">usdc</span>}
              </div>
              <p className="text-[9px] font-medium text-slate-500 mt-1 uppercase tracking-tighter">
                {!isCreator && "Tax & Discount included"}
              </p>
              {isCreator && (
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-6">
                      <div className="bg-primary h-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
              )}
          </section>
        </div>

        <div className="px-6 mb-6">
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button onClick={() => setActiveTab("pay")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pay' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
              <Wallet size={14} /> My Portion
            </button>
            <button onClick={() => setActiveTab("details")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'details' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
              <Receipt size={14} /> Full Details
            </button>
          </div>
        </div>

        <div className="px-6 space-y-8">
          {activeTab === "pay" ? (
            <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Items assigned to you</h3>
                <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 shadow-sm">
                  {myItems.map((item) => (
                    <div key={item.id} className="p-5 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'paid' ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"}`}>
                          {item.status === 'paid' ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate lowercase">{item.item_name}</p>
                          <p className="text-[10px] font-medium text-slate-400">Splitted share</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{item.amount.toFixed(2)}</p>
                    </div>
                  ))}
                  {myItems.length === 0 && <div className="p-10 text-center text-slate-400 text-xs italic lowercase">no items assigned to you.</div>}
                </div>
              </div>

              <div className="px-5 py-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-3 shadow-inner shadow-black/[0.02]">
                <div className="flex justify-between text-xs font-medium text-slate-500 lowercase">
                  <span>your items subtotal</span>
                  <span className="font-bold text-slate-900">{mySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-400 lowercase">
                  <span>your tax share (prop.)</span>
                  <span className="text-slate-600">+{myTaxShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-emerald-500 lowercase">
                  <span>your discount share</span>
                  <span>-{myDiscountShare.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900 lowercase">total payable</span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900">{myFinalTotal.toFixed(2)}</span>
                      <span className="text-[10px] font-bold text-slate-400">USDC</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Squad breakdown</h3>
                <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 shadow-sm">
                  {groupedFullItems.map((item, idx) => (
                    <div key={idx} className="p-5 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm font-bold text-slate-800 lowercase truncate flex-1">{item.item_name}</p>
                        <p className="text-sm font-bold text-slate-900">{item.total_item_price.toFixed(2)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.eaters.map((eHash: string, i: number) => (
                          <span key={i} className={`text-[9px] px-2 py-0.5 rounded-lg border font-bold lowercase ${eHash === myHash ? "bg-primary text-slate-900 border-primary shadow-sm" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                            {eHash === myHash ? "me" : (profiles[eHash] || "user").split(' ')[0].toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-2 space-y-3">
                <div className="flex justify-between text-xs font-medium text-slate-400 lowercase">
                  <span>grand tax amount</span>
                  <span>{bill?.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-emerald-500 lowercase">
                  <span>grand discounts</span>
                  <span>-{bill?.discount_amount?.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900 lowercase">total master receipt</span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900">{bill?.total_amount?.toFixed(2)}</span>
                      <span className="text-[10px] font-bold text-slate-400">USDC</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {!isCreator && myTotalToPay > 0 && !isAlreadyRejected && activeTab === 'pay' && (
        <div className="p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 sticky bottom-0 z-30 space-y-4">
          <button 
            onClick={handleSettlement}
            disabled={isPayingOnChain || isRejecting}
            className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 transition-all"
          >
            {isPayingOnChain ? <Loader2 className="animate-spin" size={18}/> : <Wallet size={16}/>} 
            pay {myFinalTotal.toFixed(2)} USDC
          </button>
          
          <button onClick={handleReject} disabled={isPayingOnChain || isRejecting} className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-all uppercase tracking-widest">
            {isRejecting ? <Loader2 className="animate-spin" size={12}/> : "this isn't my bill"}
          </button>
        </div>
      )}

      {!isCreator && isAlreadyRejected && (
        <div className="p-6 bg-slate-50 border-t border-slate-100 sticky bottom-0 z-30 text-center">
            <p className="text-xs font-semibold text-red-500 lowercase tracking-widest">you have declined this bill</p>
        </div>
      )}
    </div>
  )
}
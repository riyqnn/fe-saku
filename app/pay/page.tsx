"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, Loader2, Wallet, Info, CheckCircle2, 
  User, ReceiptText, Clock, Users, Sparkles, PartyPopper, XCircle 
} from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { hashPhoneNumber } from "@/utils/phoneHash"
import { useSakuTransfer } from "@/hooks/useSakuTransfer" 
import { toast } from "sonner"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function BillDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const { user } = useAuth()
  
  const { transferByPhone, loading: isPaying } = useSakuTransfer()

  const [bill, setBill] = useState<any>(null)
  const [creatorName, setCreatorName] = useState<string | null>(null)
  const [allBillItems, setAllBillItems] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false) // State untuk loading tolak

  const myHash = user?.phone_number ? hashPhoneNumber(user.phone_number) : ""
  const isCreator = bill?.creator_id === user?.phone_number

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user?.phone_number || !id) return
      try {
        const { data: header } = await supabase.from('split_bills').select('*').eq('id', id).single()
        
        if (header) {
          setBill(header)
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('phone_number', header.creator_id)
            .single()
          setCreatorName(profile?.full_name || header.creator_id)
        }
        
        const { data: allItems } = await supabase
          .from('split_bill_items')
          .select('*')
          .eq('bill_id', id)

        setAllBillItems(allItems || [])
      } catch (err) {
        console.error(err)
      } finally {
        setFetching(false)
      }
    }
    fetchDetails()
  }, [user, id])

  const myPendingItems = allBillItems.filter(item => item.debtor_phone_hash === myHash && !item.is_paid)
  const totalToPay = myPendingItems.reduce((acc, item) => acc + item.amount, 0)

  const paidItemsCount = allBillItems.filter(i => i.is_paid).length
  const totalItemsCount = allBillItems.length
  const progressPercent = totalItemsCount > 0 ? (paidItemsCount / totalItemsCount) * 100 : 0

  const handleSettlement = async () => {
    if (!bill || totalToPay <= 0) return

    toast.promise(
      (async () => {
        const result = await transferByPhone({
          receiverPhone: bill.creator_id,
          amount: totalToPay.toString()
        })

        if (!result.success) throw new Error(result.error || "Blockchain transfer failed")

        const { error: updateError } = await supabase
          .from('split_bill_items')
          .update({ is_paid: true })
          .eq('bill_id', id)
          .eq('debtor_phone_hash', myHash)

        if (updateError) throw new Error("Status update failed.")

        setIsSuccess(true)
        setTimeout(() => router.push('/home'), 3000)
        return result
      })(),
      {
        loading: 'Processing on-chain payment...',
        success: 'Payment Success! 💸',
        error: (err) => `Error: ${err.message}`
      }
    )
  }

  // FUNGSI TOLAK BILL
  const handleRejectBill = async () => {
    const confirmReject = confirm("Yakin mau tolak tagihan ini? Data kamu bakal diapus dari list bill ini.")
    if (!confirmReject) return

    setIsRejecting(true)
    try {
      const { error } = await supabase
        .from('split_bill_items')
        .delete()
        .eq('bill_id', id)
        .eq('debtor_phone_hash', myHash)

      if (error) throw error

      toast.success("Bill rejected successfully! ✌️")
      router.push('/home')
    } catch (err: any) {
      toast.error("Failed to reject: " + err.message)
    } finally {
      setIsRejecting(false)
    }
  }

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-6 text-center z-[100] fixed inset-0">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl space-y-6 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-12 h-12 text-green-600 animate-bounce" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-black">PAID!</h1>
          <div className="space-y-2">
            <p className="text-sm font-bold text-black/60">Your portion of <span className="text-black font-black italic">"{bill?.description}"</span> has been settled.</p>
            <p className="text-[10px] font-bold text-primary tracking-widest uppercase italic">Transaction confirmed on-chain</p>
          </div>
          <div className="pt-4">
             <div className="flex items-center justify-center gap-2 text-black/20 animate-pulse">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-widest">Returning to Home...</span>
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-10">
      <div className="p-6 flex items-center justify-between border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-black/5 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="text-xl font-black italic tracking-tight">Bill Detail</h1>
        </div>
        {isCreator && (
          <div className="px-3 py-1 bg-primary/20 rounded-full">
            <p className="text-[10px] font-black text-amber-900 tracking-widest italic">Creator View</p>
          </div>
        )}
      </div>

      <main className="p-6 space-y-8 flex-1">
        <section className={`p-8 rounded-[2.5rem] shadow-xl transition-all ${isCreator ? "bg-black text-white" : "bg-gradient-to-br from-primary via-amber-200 to-primary/80"}`}>
          <div className="space-y-4">
            <div>
              <p className={`text-[10px] font-bold tracking-[0.2em] opacity-60`}>
                {isCreator ? "Collection Progress" : `Pay to ${creatorName}`}
              </p>
              <p className="text-4xl font-black italic tracking-tighter mt-1">
                {isCreator ? `${Math.round(progressPercent)}%` : `IDR ${totalToPay.toLocaleString()}`}
              </p>
            </div>
            
            {isCreator ? (
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-full w-fit text-[10px] font-bold italic">
                <Info size={12} /> Proportional Tax & Discount Included
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black italic tracking-tight capitalize">{bill?.description || "Shared Bill"}</h2>
            <p className="text-[10px] font-bold text-black/30 tracking-[0.2em]">{bill?.created_at ? new Date(bill.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : ""}</p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-black/40 tracking-widest italic">Itemized Breakdown</h3>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary italic">
                  <Users size={12} /> {allBillItems.length} Items Total
                </div>
            </div>

            <div className="space-y-4">
              {allBillItems.map((item) => {
                const isMine = item.debtor_phone_hash === myHash
                return (
                  <div key={item.id} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.is_paid ? "bg-green-100 text-green-600" : "bg-muted text-black/20"}`}>
                        {item.is_paid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold capitalize ${isMine ? "text-primary" : "text-black"}`}>
                          {item.item_name} {isMine && "(You)"}
                        </p>
                        <p className="text-[9px] font-bold text-black/30 tracking-widest">
                          {item.is_paid ? "Paid" : "Pending"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black italic">Rp {item.amount.toLocaleString()}</p>
                  </div>
                )
              })}
            </div>

            <div className="border-t-2 border-dashed border-black/5 pt-6 space-y-3">
              <div className="flex justify-between text-[11px] font-bold text-black/40 tracking-widest">
                <span>Total Tax</span>
                <span>Rp {bill?.tax_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-amber-600 tracking-widest">
                <span>Total Discount</span>
                <span>-Rp {bill?.discount_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-black/5">
                <span className="text-sm font-black italic">Total Bill</span>
                <span className="text-lg font-black italic text-black">Rp {bill?.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ACTION BUTTONS (PAY & REJECT) */}
      {!isCreator && totalToPay > 0 && (
        <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-border sticky bottom-0 z-30 animate-in slide-in-from-bottom duration-500 space-y-3">
          <div className="flex gap-3">
             {/* Button Tolak */}
            <button 
              onClick={handleRejectBill}
              disabled={isRejecting || isPaying}
              className="flex-1 py-6 rounded-[2.5rem] bg-muted text-black/40 font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 transition-all italic text-[11px]"
            >
              {isRejecting ? <Loader2 className="animate-spin" size={16}/> : <XCircle size={16}/>} 
              Reject
            </button>

            {/* Button Bayar */}
            <button 
              onClick={handleSettlement}
              disabled={isPaying || isRejecting}
              className="flex-[2.5] py-6 rounded-[3rem] bg-black text-primary font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 transition-all italic"
            >
              {isPaying ? <Loader2 className="animate-spin" size={18}/> : <Wallet size={18}/>} 
              Pay My Portion
            </button>
          </div>
          <p className="text-[9px] text-center font-bold text-black/20 italic">If you reject, your name will be removed from this list.</p>
        </div>
      )}

      {isCreator && progressPercent < 100 && (
        <div className="px-6 text-center">
          <p className="text-[10px] font-bold text-black/30 tracking-widest">Waiting for other members to settle...</p>
        </div>
      )}
    </div>
  )
}
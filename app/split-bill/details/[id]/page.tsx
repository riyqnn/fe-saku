"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Wallet, Info, CheckCircle2, User, ReceiptText, Clock, Users } from "lucide-react"
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

  // Memoized user hash
  const myHash = user?.phone_number ? hashPhoneNumber(user.phone_number) : ""
  const isCreator = bill?.creator_id === user?.phone_number

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user?.phone_number || !id) return
      try {
        // 1. Ambil Header Bill
        const { data: header } = await supabase.from('split_bills').select('*').eq('id', id).single()
        
        if (header) {
          setBill(header)
          // Ambil nama creator
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('phone_number', header.creator_id)
            .single()
          setCreatorName(profile?.full_name || header.creator_id)
        }
        
        // 2. Ambil SEMUA item
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

  // Filter item milik saya yang belum lunas
  const myPendingItems = allBillItems.filter(item => item.debtor_phone_hash === myHash && !item.is_paid)
  const totalToPay = myPendingItems.reduce((acc, item) => acc + item.amount, 0)

  // Statistik buat Creator
  const paidItemsCount = allBillItems.filter(i => i.is_paid).length
  const totalItemsCount = allBillItems.length
  const progressPercent = totalItemsCount > 0 ? (paidItemsCount / totalItemsCount) * 100 : 0

  const handleSettlement = async () => {
    if (!bill || totalToPay <= 0) return

    toast.promise(
      (async () => {
        const result = await transferByPhone({
          receiverPhone: bill.creator_id,
          amount: totalToPay.toString(),
          type: 'SPLIT_BILL_SETTLEMENT', 
          referenceId: id
        })

        if (!result.success) throw new Error(result.error || "Blockchain transfer failed")

        const { error: updateError } = await supabase
          .from('split_bill_items')
          .update({ is_paid: true })
          .eq('bill_id', id)
          .eq('debtor_phone_hash', myHash)

        if (updateError) throw new Error("Status update failed.")

        setTimeout(() => router.push('/home'), 2000)
        return result
      })(),
      {
        loading: 'Processing on-chain payment...',
        success: 'Payment Success! 💸',
        error: (err) => `Error: ${err.message}`
      }
    )
  }

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

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
            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest italic">Creator View</p>
          </div>
        )}
      </div>

      <main className="p-6 space-y-8 flex-1">
        {/* Top Card: Status Summary */}
        <section className={`p-8 rounded-[2.5rem] shadow-xl transition-all ${isCreator ? "bg-black text-white" : "bg-gradient-to-br from-primary via-amber-200 to-primary/80"}`}>
          <div className="space-y-4">
            <div>
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase opacity-60`}>
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

        {/* Receipt Details */}
        <section className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-sm space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black italic tracking-tight capitalize">{bill?.description || "Shared Bill"}</h2>
            <p className="text-[10px] font-bold text-black/30 tracking-[0.2em] uppercase">{new Date(bill?.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-black/40 tracking-widest uppercase italic">Itemized Breakdown</h3>
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
                        <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">
                          {item.is_paid ? "Paid" : "Pending"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black italic">Rp {item.amount.toLocaleString()}</p>
                  </div>
                )
              })}
            </div>

            {/* Calculations Section */}
            <div className="border-t-2 border-dashed border-black/5 pt-6 space-y-3">
              <div className="flex justify-between text-[11px] font-bold text-black/40 uppercase tracking-widest">
                <span>Total Tax</span>
                <span>Rp {bill?.tax_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-amber-600 uppercase tracking-widest">
                <span>Total Discount</span>
                <span>-Rp {bill?.discount_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-black/5">
                <span className="text-sm font-black italic uppercase">Total Bill</span>
                <span className="text-lg font-black italic text-black">Rp {bill?.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Pay Action - Only visible if I have items to pay */}
      {!isCreator && totalToPay > 0 && (
        <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-border sticky bottom-0 z-30 animate-in slide-in-from-bottom duration-500">
          <button 
            onClick={handleSettlement}
            disabled={isPaying}
            className="w-full py-6 rounded-[3rem] bg-black text-primary font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 transition-all italic"
          >
            {isPaying ? <Loader2 className="animate-spin" size={18}/> : <Wallet size={18}/>} 
            Pay My Portion
          </button>
        </div>
      )}

      {/* Creator Info Action */}
      {isCreator && progressPercent < 100 && (
        <div className="px-6 text-center">
          <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase">Waiting for other members to settle...</p>
        </div>
      )}
    </div>
  )
}
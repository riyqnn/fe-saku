"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Wallet, Info, CheckCircle2, User, ReceiptText } from "lucide-react"
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
  const [myItems, setMyItems] = useState<any[]>([])
  const [allBillItems, setAllBillItems] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user?.phone_number || !id) return
      try {
        const myHash = hashPhoneNumber(user.phone_number)
        
        // 1. Ambil Header Bill
        const { data: header } = await supabase.from('split_bills').select('*').eq('id', id).single()
        
        if (header) {
          setBill(header)
          // Cari nama asli creator berdasarkan phone_number
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('phone_number', header.creator_id)
            .single()
          
          if (profile?.full_name) {
            setCreatorName(profile.full_name)
          }
        }
        
        // 2. Ambil SEMUA item di bill ini
        const { data: allItems } = await supabase
          .from('split_bill_items')
          .select('*')
          .eq('bill_id', id)

        setAllBillItems(allItems || [])
        setMyItems(allItems?.filter(item => item.debtor_phone_hash === myHash && !item.is_paid) || [])
      } catch (err) {
        // Error handled silently
      } finally {
        setFetching(false)
      }
    }
    fetchDetails()
  }, [user, id])

  const totalToPay = myItems.reduce((acc, item) => acc + item.amount, 0)

  const handleSettlement = async () => {
    if (!bill || totalToPay <= 0) return

    toast.promise(
      (async () => {
        const result = await transferByPhone({
          receiverPhone: bill.creator_id,
          amount: totalToPay.toString()
        })

        if (!result.success) throw new Error(result.error || "Blockchain transfer failed")

        const myHash = hashPhoneNumber(user?.phone_number!)
        const { error: updateError } = await supabase
          .from('split_bill_items')
          .update({ is_paid: true })
          .eq('bill_id', id)
          .eq('debtor_phone_hash', myHash)

        if (updateError) throw new Error("Payment success, but status update failed.")

        setTimeout(() => router.push('/home'), 2000)
        return result
      })(),
      {
        loading: 'Broadcasting to blockchain...',
        success: 'Settled! 💸',
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
      <div className="p-6 flex items-center gap-4 border-b border-border sticky top-0 bg-white/50 backdrop-blur-md z-30">
        <button onClick={() => router.back()} className="p-2 hover:bg-primary/10 rounded-xl transition-all">
          <ArrowLeft className="w-6 h-6 text-black/85" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-black/85 italic">Bill Summary</h1>
      </div>

      <main className="p-6 space-y-8 flex-1 overflow-x-hidden">
        {/* Wallet-Style Summary Card */}
        <section className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 overflow-hidden shadow-xl shadow-primary/20 group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <ReceiptText size={80} className="text-amber-900" />
          </div>
          <div className="relative z-10 space-y-1">
            <p className="text-[10px] font-bold text-amber-900/60 tracking-[0.2em] capitalize">
              You owe {creatorName || bill?.creator_id}
            </p>
            <p className="text-4xl font-bold text-black/85 tracking-tighter italic">IDR {totalToPay.toLocaleString()}</p>
            <div className="pt-4 flex items-center gap-2">
               <div className="px-3 py-1.5 bg-black/5 backdrop-blur-sm rounded-full flex items-center gap-2 text-[10px] font-semibold text-amber-900/80 border border-black/5">
                <Info size={12} /> Proportional Tax & Discount Included
               </div>
            </div>
          </div>
        </section>

        {/* Paper Receipt Style Section */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="text-center mb-8 space-y-1">
            <p className="font-bold text-lg italic capitalize">{bill?.description || "Shared Bill"}</p>
            <p className="text-[10px] font-semibold text-black/30 tracking-widest">{new Date(bill?.created_at).toLocaleDateString()}</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-bold text-black/40 tracking-widest">Item Breakdown</p>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-[8px] font-bold text-black/40 italic capitalize">
                    <User size={8} /> Prepared by {creatorName || bill?.creator_id}
                </div>
            </div>
            
            <div className="space-y-4">
              {allBillItems.map((item) => {
                const isMine = item.debtor_phone_hash === hashPhoneNumber(user?.phone_number!)
                return (
                  <div key={item.id} className={`flex justify-between items-start transition-opacity ${isMine ? "opacity-100" : "opacity-30"}`}>
                    <div className="space-y-0.5">
                      <p className={`text-sm font-bold capitalize ${isMine ? "text-black" : "text-black/60"}`}>{item.item_name}</p>
                      {!isMine && (
                         <div className="flex items-center gap-1 text-[9px] font-semibold text-black/40 italic">
                            <User size={8} /> Other Member's Item
                         </div>
                      )}
                    </div>
                    <p className={`text-sm font-bold italic ${isMine ? "text-black" : "text-black/40"}`}>
                      IDR {item.amount.toLocaleString()}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Receipt Footer Calculations */}
            <div className="border-t border-dashed border-black/10 pt-4 mt-6 space-y-2">
              <div className="flex justify-between text-[11px] font-semibold text-black/40">
                <span>Total Shared Tax</span>
                <span>IDR {bill?.tax_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-amber-600">
                <span>Total Shared Discount</span>
                <span>-IDR {bill?.discount_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-black/5">
                <span className="text-xs font-bold italic">Your Net Settlement</span>
                <span className="text-sm font-bold italic text-black">IDR {totalToPay.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className={`p-6 bg-white/80 backdrop-blur-xl border-t border-border sticky bottom-0 z-30 transition-all ${myItems.length === 0 ? "opacity-0 translate-y-10" : "opacity-100"}`}>
        {myItems.length > 0 && (
          <button 
            onClick={handleSettlement}
            disabled={isPaying}
            className="w-full py-6 rounded-[3rem] bg-primary text-black font-bold text-xs shadow-xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 transition-all tracking-widest italic"
          >
            {isPaying ? <Loader2 className="animate-spin" size={18}/> : <Wallet size={18}/>} 
            Pay Now
          </button>
        )}
      </div>
    </div>
  )
}
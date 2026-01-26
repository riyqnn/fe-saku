"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Wallet, Info, CheckCircle2 } from "lucide-react"
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
  const [items, setItems] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user?.phone_number || !id) return
      try {
        const myHash = hashPhoneNumber(user.phone_number)
        const { data: header } = await supabase.from('split_bills').select('*').eq('id', id).single()
        const { data: myItems } = await supabase
          .from('split_bill_items')
          .select('*')
          .eq('bill_id', id)
          .eq('debtor_phone_hash', myHash)
          .eq('is_paid', false)

        setBill(header)
        setItems(myItems || [])
      } catch (err) {
        console.error("Fetch details failed", err)
      } finally {
        setFetching(false)
      }
    }
    fetchDetails()
  }, [user, id])

  const totalToPay = items.reduce((acc, item) => acc + item.amount, 0)

  const handleSettlement = async () => {
    if (!bill || totalToPay <= 0) return

    toast.promise(
      (async () => {
        const result = await transferByPhone({
          receiverPhone: bill.creator_id,
          amount: totalToPay.toString()
        })

        if (!result.success) {
          throw new Error(result.error || "Blockchain transfer failed")
        }

        const myHash = hashPhoneNumber(user?.phone_number!)
        const { error: updateError } = await supabase
          .from('split_bill_items')
          .update({ is_paid: true })
          .eq('bill_id', id)
          .eq('debtor_phone_hash', myHash)

        if (updateError) throw new Error("Payment on-chain success, but failed to update status. Please notify admin.")

        setTimeout(() => router.push('/home'), 2000)
        return result
      })(),
      {
        loading: 'Processing blockchain transaction...',
        success: 'Payment Successful! Debt settled on-chain. 💸',
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
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
      <div className="p-6 flex items-center gap-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black italic tracking-tight italic">Split Bill Details</h1>
      </div>

      <main className="p-6 space-y-8 flex-1">
        <section className="p-10 rounded-[3.5rem] bg-black text-white space-y-4 text-center shadow-2xl border border-white/5">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Paying To {bill?.creator_id}</p>
          <h2 className="text-5xl font-black tracking-tighter italic">IDR {totalToPay.toLocaleString()}</h2>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
            <Info size={12} className="text-primary" /> Total of {items.length} items
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-4">Menu Selection</h3>
          <div className="space-y-3">
            {items.length > 0 ? items.map((item) => (
              <div key={item.id} className="p-6 rounded-[2.5rem] bg-white border border-black/5 flex justify-between items-center shadow-sm">
                <div>
                    <p className="font-black text-sm text-foreground">{item.item_name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Split Item</p>
                </div>
                <span className="font-black text-sm text-black italic">IDR {item.amount.toLocaleString()}</span>
              </div>
            )) : (
                <div className="p-10 text-center border-2 border-dashed rounded-[3rem] border-muted">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
                    <p className="text-sm font-bold text-muted-foreground">All items paid! ✅</p>
                </div>
            )}
          </div>
        </section>
      </main>

      <div className="p-6 bg-background/80 backdrop-blur-xl border-t border-border sticky bottom-0">
        <button 
          onClick={handleSettlement}
          disabled={isPaying || items.length === 0}
          className="w-full py-6 rounded-[3rem] bg-primary text-white font-black text-xs shadow-xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-30"
        >
          {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
          CONFIRM SETTLEMENT
        </button>
      </div>
    </div>
  )
}
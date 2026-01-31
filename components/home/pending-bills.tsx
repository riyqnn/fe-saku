"use client"

import { usePendingBills } from "@/hooks/usePendingBills"
import { Receipt, ArrowRight, Sparkles, Loader2, User, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PendingBillsSection() {
  const router = useRouter()
  // Note: Make sure your usePendingBills hook fetches bills where status is 'pending' OR 'rejected'
  const { bills, loading } = usePendingBills() 
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchNames = async () => {
      const uniquePhoneNumbers = [...new Set(bills.map(b => b.creator_id))]
      if (uniquePhoneNumbers.length === 0) return

      const { data } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .in('phone_number', uniquePhoneNumbers)

      if (data) {
        const nameMap = data.reduce((acc, curr) => ({
          ...acc,
          [curr.phone_number]: curr.full_name
        }), {})
        setCreatorNames(nameMap)
      }
    }

    if (bills.length > 0) fetchNames()
  }, [bills])

  if (loading) return (
    <div className="flex items-center justify-center p-8 bg-primary/5 rounded-[2.5rem] border border-dashed border-primary/20">
       <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  )
  
  if (bills.length === 0) return null

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-[11px] font-black text-black/40 tracking-widest uppercase italic">
          Bill Requests ({bills.length})
        </h3>
        <div className="p-1.5 bg-primary/20 rounded-lg">
            <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        {bills.map((bill) => {
          const creatorDisplayName = creatorNames[bill.creator_id] || bill.creator_id
          // Check if any item in this bill was rejected by you
          // Assuming your hook provides a 'status' field for the debtor's portion
          const isRejected = bill.status === 'rejected'

          return (
            <button 
              key={bill.id} 
              onClick={() => router.push(`/split-bill/details/${bill.id}`)}
              className={`w-full p-6 rounded-[2.5rem] bg-white border flex items-center justify-between group active:scale-95 transition-all hover:shadow-xl hover:shadow-primary/5 
                ${isRejected ? "border-red-100 opacity-80" : "border-black/5 shadow-sm hover:border-primary/50"}`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className={`p-4 rounded-2xl group-hover:rotate-12 transition-transform duration-300 
                  ${isRejected ? "bg-red-50 text-red-500" : "bg-primary text-amber-900"}`}>
                  {isRejected ? <XCircle className="w-6 h-6" /> : <Receipt className="w-6 h-6 opacity-30" />}
                </div>
                <div>
                  <p className={`text-[10px] font-black capitalize leading-none mb-1.5 flex items-center gap-1 italic 
                    ${isRejected ? "text-red-500" : "text-amber-600"}`}>
                    <User size={10} strokeWidth={3} />
                    From {creatorDisplayName}
                  </p>
                  <p className={`text-base font-black capitalize tracking-tight ${isRejected ? "text-red-900/40" : "text-black/85"}`}>
                    {bill.description || "Untitled bill"}
                  </p>
                  {isRejected && (
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest italic bg-red-50 px-2 py-0.5 rounded-full">
                      Declined by you
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <p className={`text-sm font-black tracking-tighter italic ${isRejected ? "line-through text-black/20" : "text-black"}`}>
                  IDR {bill.your_total_debt.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-black text-black/30 capitalize italic">
                  <span>{bill.items_count} items</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
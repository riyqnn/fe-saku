"use client"

import { usePendingBills } from "@/hooks/usePendingBills"
import { Receipt, ArrowRight, Sparkles, Loader2, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PendingBillsSection() {
  const router = useRouter()
  const { bills, loading } = usePendingBills()
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({})

  // Logic buat nyari nama asli berdasarkan phone_number creator
  useEffect(() => {
    const fetchNames = async () => {
      const uniquePhoneNumbers = [...new Set(bills.map(b => b.creator_id))]
      if (uniquePhoneNumbers.length === 0) return

      const { data, error } = await supabase
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-[11px] font-semibold text-black/40 tracking-widest uppercase">
          Pending Split Bills ({bills.length})
        </h3>
        <div className="p-1.5 bg-primary/20 rounded-lg">
            <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        {bills.map((bill) => {
          const creatorDisplayName = creatorNames[bill.creator_id] || bill.creator_id

          return (
            <button 
              key={bill.id} 
              onClick={() => router.push(`/split-bill/details/${bill.id}`)}
              className="w-full p-6 rounded-[2.5rem] bg-white border border-black/5 shadow-sm flex items-center justify-between group active:scale-95 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-4 bg-primary rounded-2xl group-hover:rotate-12 transition-transform duration-300">
                  <Receipt className="w-6 h-6 text-amber-900 opacity-30" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 capitalize leading-none mb-1.5 flex items-center gap-1">
                    <User size={10} strokeWidth={3} />
                    From {creatorDisplayName}
                  </p>
                  <p className="text-base font-semibold text-black/85 capitalize">
                    {bill.description || "Untitled bill"}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <p className="text-sm font-bold text-black tracking-tighter italic">
                  IDR {bill.your_total_debt.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-black/30 capitalize">
                  <span>{bill.items_count} menus</span>
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
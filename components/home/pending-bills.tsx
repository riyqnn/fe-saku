"use client"

import { usePendingBills } from "@/hooks/usePendingBills"
import { ArrowRight, Loader2, XCircle, Wallet, Info, AlertCircle, Edit3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function PendingBillsSection() {
  const router = useRouter()
  const { user } = useAuth()
  const { bills, loading } = usePendingBills() 
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchNames = async () => {
      // Ambil ID creator untuk bill masuk, atau debtor untuk bill yang ditolak
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
    <div className="flex items-center justify-center p-12">
       <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
    </div>
  )
  
  if (bills.length === 0) return null

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 font-sans px-2">
      {/* Header Section */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Action Required
            </h3>
        </div>
        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
            {bills.length} task{bills.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-2">
      {bills.map((bill) => {
        const isCreatorAction = bill.has_rejection && bill.creator_id === user?.phone_number;
        const creatorDisplayName = creatorNames[bill.creator_id] || bill.creator_id;

        return (
          <button 
            key={bill.id} 
            onClick={() => router.push(isCreatorAction ? `/split-bill/edit/${bill.id}` : `/split-bill/details/${bill.id}`)}
            className={`w-full flex items-center gap-4 p-4 rounded-[2rem] border transition-all ${
              isCreatorAction ? "bg-red-50 border-red-100" : "bg-white border-transparent hover:bg-slate-50 shadow-sm"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 font-bold">
              {isCreatorAction ? "!" : creatorDisplayName.charAt(0)}
            </div>
            
            <div className="flex-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                {isCreatorAction ? "Action Required" : `From ${creatorDisplayName}`}
              </p>
              <h4 className="text-sm font-bold text-slate-900">{bill.description}</h4>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">
                {parseFloat(isCreatorAction ? bill.total_amount : bill.your_total_debt).toFixed(2)}
              </p>
              <span className="text-[10px] font-bold text-slate-400">USDC</span>
            </div>
          </button>
        )
      })}
      </div>

      {/* Dynamic Info Prompt */}
      <div className="mx-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
        <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Keep your finances clean. You have tasks that need your response to settle the squad's bills.
        </p>
      </div>
    </div>
  )
}
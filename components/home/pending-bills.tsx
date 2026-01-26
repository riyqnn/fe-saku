"use client"

import { usePendingBills } from "@/hooks/usePendingBills"
import { Receipt, ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PendingBillsSection() {
  const router = useRouter()
  const { bills, loading } = usePendingBills()

  if (loading) return (
    <div className="flex items-center justify-center p-8 bg-muted/20 rounded-[2.5rem] border border-dashed border-muted">
       <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  )
  
  if (bills.length === 0) return null

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Pending Split Bills ({bills.length})
        </h3>
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
      </div>

      <div className="space-y-3">
        {bills.map((bill) => (
          <button 
            key={bill.id} 
            onClick={() => router.push(`/split-bill/details/${bill.id}`)}
            className="w-full p-6 rounded-[2.5rem] bg-white border border-black/5 shadow-sm flex items-center justify-between group active:scale-95 transition-all hover:border-primary/20"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-primary uppercase leading-none mb-1">
                  FROM: {bill.creator_id}
                </p>
                <p className="text-sm font-bold text-foreground">
                  {bill.description || "Untitled Bill"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-black text-black">
                IDR {bill.your_total_debt.toLocaleString()}
              </p>
              <div className="flex items-center justify-end gap-1 text-[9px] font-black text-muted-foreground uppercase">
                <span>{bill.items_count} items</span>
                <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
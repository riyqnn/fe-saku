"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, Loader2, Save, Plus, 
  Trash2, User, ReceiptText, Smartphone
} from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { hashPhoneNumber } from "@/utils/phoneHash"
import { toast } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const { user } = useAuth()

  // State yang sama persis dengan halaman Create
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 1. Fetch data lama untuk mengisi form (Populate)
  useEffect(() => {
    const fetchOriginalBill = async () => {
      if (!id || !user) return
      try {
        const { data: bill, error: billErr } = await supabase
          .from('split_bills')
          .select('*, split_bill_items(*)')
          .eq('id', id)
          .single()

        if (billErr) throw billErr
        
        // Proteksi: Pastikan hanya creator yang bisa edit
        if (bill.creator_id !== user.phone_number) {
          toast.error("Unauthorized")
          return router.push('/home')
        }

        setDescription(bill.description)
        // Map items ke state form, tambahkan field temp_phone untuk input baru
        setItems(bill.split_bill_items.map((item: any) => ({
          ...item,
          temp_phone: "", // Digunakan jika ingin mengganti orang (nomor HP)
          is_existing: true // Flag untuk membedakan data lama dan baru
        })))
      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOriginalBill()
  }, [id, user, router])

  // Handlers (Mirip halaman Create)
  const addItem = () => {
    setItems([...items, { item_name: "", amount: "", temp_phone: "", is_existing: false }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  // 2. Save Logic (Update & Upsert)
  const handleSave = async () => {
    if (!description || items.length === 0) return toast.error("Complete the form first")
    
    setSaving(true)
    try {
      // Update Header
      await supabase
        .from('split_bills')
        .update({ description })
        .eq('id', id)

      // Update atau Create Items
      for (const item of items) {
        const itemBody: any = {
          bill_id: id,
          item_name: item.item_name,
          amount: Number(item.amount),
        }

        // Jika nomor HP baru diisi, update hash dan reset status
        if (item.temp_phone) {
          itemBody.debtor_phone_hash = hashPhoneNumber(item.temp_phone)
          itemBody.status = 'pending'
          itemBody.is_paid = false
        }

        if (item.is_existing) {
          await supabase.from('split_bill_items').update(itemBody).eq('id', item.id)
        } else {
          // Input data baru jika creator menambah baris saat edit
          itemBody.debtor_phone_hash = hashPhoneNumber(item.temp_phone)
          await supabase.from('split_bill_items').insert(itemBody)
        }
      }

      toast.success("Changes saved! Resending notifications...")
      router.push(`/split-bill/details/${id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <button onClick={() => router.back()} className="p-2 hover:bg-black/5 rounded-xl transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black italic tracking-tight uppercase">Update Bill</h1>
      </div>

      <main className="p-6 space-y-8 flex-1">
        {/* Section 1: Description */}
        <div className="space-y-2 px-2">
          <label className="text-[10px] font-black text-black/40 tracking-[0.2em] uppercase italic">Bill Description</label>
          <div className="relative">
            <ReceiptText className="absolute left-6 top-1/2 -translate-y-1/2 text-black/20" size={20} />
            <input 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-muted/50 rounded-[2rem] pl-16 pr-8 py-6 text-xl font-bold outline-none border-2 border-transparent focus:border-primary/50 transition-all"
              placeholder="e.g., Dinner at Senopati"
            />
          </div>
        </div>

        {/* Section 2: Items (The "Create-style" List) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-black text-black/40 tracking-[0.2em] uppercase italic">Item Details</h3>
            <button onClick={addItem} className="flex items-center gap-2 text-[10px] font-black text-primary uppercase italic">
              <Plus size={14} strokeWidth={3} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={index} 
                className={`p-6 rounded-[2.5rem] border-2 transition-all animate-in zoom-in duration-300 ${item.status === 'rejected' ? "border-red-200 bg-red-50/20" : "border-black/5 bg-white"}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between gap-4">
                    <input 
                      value={item.item_name}
                      onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                      className="flex-1 bg-transparent text-lg font-black italic outline-none border-b-2 border-dashed border-black/10 focus:border-primary"
                      placeholder="Menu/Item Name"
                    />
                    <button onClick={() => removeItem(index)} className="p-2 text-black/20 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-black/20 uppercase">Rp</span>
                      <input 
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className="w-full bg-black/5 rounded-2xl pl-10 pr-4 py-3 font-bold text-sm outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={14} />
                      <input 
                        value={item.temp_phone}
                        onChange={(e) => updateItem(index, 'temp_phone', e.target.value)}
                        className="w-full bg-black/5 rounded-2xl pl-10 pr-4 py-3 font-bold text-sm outline-none"
                        placeholder={item.is_existing ? "Replace person?" : "Phone number"}
                      />
                    </div>
                  </div>
                  {item.status === 'rejected' && (
                    <p className="text-[9px] font-black text-red-500 uppercase italic">⚠️ Declined by member. Check the number.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-border z-40 max-w-lg mx-auto">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-6 rounded-[3rem] bg-black text-primary font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 transition-all italic"
        >
          {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
          Save Changes
        </button>
      </div>
    </div>
  )
}
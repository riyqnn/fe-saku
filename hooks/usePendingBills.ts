"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { hashPhoneNumber } from "@/utils/phoneHash"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export function usePendingBills() {
  const { user } = useAuth()
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPendingBills = useCallback(async () => {
    if (!user?.phone_number) return
    
    try {
      setLoading(true)
      const myHash = hashPhoneNumber(user.phone_number)
      
      // 1. Ambil tagihan di mana USER adalah DEBTOR (Pending)
      const { data: inbound } = await supabase
        .from('split_bill_items')
        .select(`amount, status, split_bills (id, creator_id, description, total_amount, created_at)`)
        .eq('debtor_phone_hash', myHash)
        .eq('is_paid', false)
        .eq('status', 'pending')

      // 2. Ambil tagihan di mana USER adalah CREATOR dan ada REJECTION
      const { data: outbound } = await supabase
        .from('split_bills')
        .select(`id, creator_id, description, total_amount, created_at, split_bill_items(id, status)`)
        .eq('creator_id', user.phone_number)
        .eq('split_bill_items.status', 'rejected')

      const combined: any[] = []

      // Map Inbound (Tagihan Masuk)
      if (inbound) {
        const grouped = inbound.reduce((acc: any, curr: any) => {
          if (!curr.split_bills) return acc
          const bid = curr.split_bills.id
          if (!acc[bid]) {
            acc[bid] = { ...curr.split_bills, your_total_debt: 0, items_count: 0, has_rejection: false }
          }
          acc[bid].your_total_debt += curr.amount
          acc[bid].items_count += 1
          return acc
        }, {})
        combined.push(...Object.values(grouped))
      }

      // Map Outbound (Tagihan Ditolak Orang)
      if (outbound) {
        outbound.forEach((b: any) => {
          const rejections = b.split_bill_items.filter((i: any) => i.status === 'rejected')
          if (rejections.length > 0) {
            combined.push({
              ...b,
              has_rejection: true,
              items_count: b.split_bill_items.length,
              your_total_debt: b.total_amount // Utk creator tampilkan total bill
            })
          }
        })
      }

      setBills(combined)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchPendingBills() }, [fetchPendingBills])

  return { bills, loading, refetch: fetchPendingBills }
}
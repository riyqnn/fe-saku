"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { hashPhoneNumber } from "@/utils/phoneHash" // Pastikan utilitas ini ada

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function usePendingBills() {
  const { user } = useAuth()
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPendingBills = useCallback(async () => {
    if (!user?.phone_number) return;
    
    try {
      setLoading(true)
      const myHash = hashPhoneNumber(user.phone_number)
      
      /**
       * Kita ambil data dari split_bill_items tapi di-join dengan split_bills.
       * Logic: Ambil semua item milik USER yang status is_paid-nya false.
       */
      const { data, error } = await supabase
        .from('split_bill_items')
        .select(`
          bill_id,
          amount,
          split_bills (
            id,
            creator_id,
            description,
            total_amount,
            created_at
          )
        `)
        .eq('debtor_phone_hash', myHash)
        .eq('is_paid', false)

      if (error) throw error

      if (data) {
        /**
         * GROUPING LOGIC:
         * Karena data yang balik itu per-item, kita kelompokkan berdasarkan bill_id.
         * Jadi satu kartu transaksi berisi total utang user di bill tersebut.
         */
        const grouped = data.reduce((acc: any, current: any) => {
          const billId = current.bill_id;
          if (!acc[billId]) {
            acc[billId] = {
              ...current.split_bills,
              your_total_debt: 0,
              items_count: 0
            };
          }
          acc[billId].your_total_debt += current.amount;
          acc[billId].items_count += 1;
          return acc;
        }, {});

        setBills(Object.values(grouped));
      }
    } catch (err: any) {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPendingBills()
  }, [fetchPendingBills])

  return { 
    bills, 
    loading, 
    refetch: fetchPendingBills 
  }
}
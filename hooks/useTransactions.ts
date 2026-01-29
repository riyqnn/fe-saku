"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"
import { supabase } from "@/lib/supabaseClient"

export function useTransactions(autoRefresh = true) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchTransactions = useCallback(async () => {
    if (!user?.phone_number) return
    setRefreshing(true)

    // 1. Ambil data transaksi (Logic OR ini sudah benar untuk Topup karena receiver = user)
    const { data: txData, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_phone.eq.${user.phone_number},receiver_phone.eq.${user.phone_number}`)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Supabase fetch error:', error)
      setRefreshing(false)
      return
    }

    if (!txData || txData.length === 0) {
      setTransactions([])
      setRefreshing(false)
      return
    }

    // 2. Kumpulkan phone number unik (Hanya jika TIDAK null)
    const phoneNumbers = new Set<string>()
    txData.forEach(tx => {
      // Cek sender (skip jika null, misal Top Up)
      if (tx.sender_phone) phoneNumbers.add(tx.sender_phone)
      // Cek receiver (skip jika null, misal Withdraw ke luar)
      if (tx.receiver_phone) phoneNumbers.add(tx.receiver_phone)
    })

    // 3. Query profiles jika ada nomor yang perlu dicari
    let nameMap: Record<string, string> = {}
    
    if (phoneNumbers.size > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .in('phone_number', Array.from(phoneNumbers))

      profilesData?.forEach(p => {
        if (p.full_name) {
          nameMap[p.phone_number] = p.full_name
        }
      })
    }

    // 4. Gabungkan data nama
    const enrichedTransactions = txData.map(tx => ({
      ...tx,
      // Jika sender null (Topup), biarkan null. Nanti dihandle UI.
      sender_name: tx.sender_phone ? (nameMap[tx.sender_phone] || null) : 'System',
      receiver_name: tx.receiver_phone ? (nameMap[tx.receiver_phone] || null) : 'External'
    }))

    setTransactions(enrichedTransactions)
    setRefreshing(false)
  }, [user?.phone_number])

  useEffect(() => {
    if (autoRefresh) fetchTransactions()
  }, [fetchTransactions, autoRefresh])

  return { transactions, refreshing, refetch: fetchTransactions }
}
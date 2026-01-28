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

    // 1. Ambil data transaksi
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

    // 2. Kumpulkan semua phone number unik (sender & receiver) dari transaksi
    const phoneNumbers = new Set<string>()
    txData.forEach(tx => {
      if (tx.sender_phone) phoneNumbers.add(tx.sender_phone)
      if (tx.receiver_phone) phoneNumbers.add(tx.receiver_phone)
    })

    // 3. Query ke tabel profiles untuk mengambil full_name
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('phone_number, full_name')
      .in('phone_number', Array.from(phoneNumbers))

    // 4. Buat Map untuk pencarian cepat: phone -> full_name
    const nameMap: Record<string, string> = {}
    profilesData?.forEach(p => {
      if (p.full_name) {
        nameMap[p.phone_number] = p.full_name
      }
    })

    // 5. Gabungkan data nama ke dalam transaksi
    const enrichedTransactions = txData.map(tx => ({
      ...tx,
      sender_name: nameMap[tx.sender_phone] || null, // Tambahkan field baru
      receiver_name: nameMap[tx.receiver_phone] || null // Tambahkan field baru
    }))

    setTransactions(enrichedTransactions)
    setRefreshing(false)
  }, [user?.phone_number])

  useEffect(() => {
    if (autoRefresh) fetchTransactions()
  }, [fetchTransactions, autoRefresh])

  return { transactions, refreshing, refetch: fetchTransactions }
}
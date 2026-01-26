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

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_phone.eq.${user.phone_number},receiver_phone.eq.${user.phone_number}`)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) console.error('Supabase fetch error:', error)
    setTransactions(data || [])
    setRefreshing(false)
  }, [user?.phone_number])

  useEffect(() => {
    if (autoRefresh) fetchTransactions()
  }, [fetchTransactions, autoRefresh])

  return { transactions, refreshing, refetch: fetchTransactions }
}
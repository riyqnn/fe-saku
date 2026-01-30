"use client"
import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface TransferByPhoneParams {
  receiverPhone: string
  amount: string
}

export interface TransferByPhoneResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  amount?: string
  receiverWallet?: string
  error?: string
}

export function useSakuTransfer() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const normalizePhone = (phone: string) => {
    let normalized = phone.replace(/\D/g, '')
    if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1)
    return normalized
  }

  const transferByPhone = useCallback(
    async (params: TransferByPhoneParams): Promise<TransferByPhoneResult> => {
      try {
        setLoading(true)
        setError(null)
        const senderPhone = normalizePhone(user?.phone_number || '')
        const receiverPhone = normalizePhone(params.receiverPhone)

        const res = await fetch('/api/transfer/phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ phoneNumber: senderPhone, receiverPhone, amount: params.amount }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Transfer gagal')

        setTxHash(data.transactionHash)
        return { success: true, ...data }
      } catch (err: any) {
        const msg = err.message || 'Unknown error'
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setLoading(false)
      }
    },
    [user, token]
  )

  return { transferByPhone, loading, error, txHash }
}

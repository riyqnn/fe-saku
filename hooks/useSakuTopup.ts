"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface TopupParams {
  amount: string
}

export interface TopupResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  approvalTxHash?: string
  error?: string
}

export function useSakuTopup() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const topup = useCallback(
    async (params: TopupParams): Promise<TopupResult> => {
      try {
        setLoading(true)
        setError(null)
        setTxHash(null)

        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.amount || isNaN(parseFloat(params.amount))) {
          throw new Error("Valid amount is required")
        }

        const amount = parseFloat(params.amount)
        if (amount <= 0) {
          throw new Error("Amount must be greater than 0")
        }

        const response = await fetch("/api/deposit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            amount: params.amount,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Topup failed")
        }

        setTxHash(data.transactionHash)
        return {
          success: true,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          approvalTxHash: data.approvalTxHash,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  return {
    topup,
    loading,
    error,
    txHash,
  }
}

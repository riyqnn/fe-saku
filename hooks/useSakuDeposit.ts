"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface DepositParams {
  amount: string
}

export interface DepositResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  approvalTxHash?: string
  error?: string
}

export function useSakuDeposit() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const deposit = useCallback(
    async (params: DepositParams): Promise<DepositResult> => {
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

        // Call deposit API - server will decrypt private key
        const response = await fetch("/api/deposit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: params.amount,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Deposit failed")
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
    [user, token]
  )

  return {
    deposit,
    loading,
    error,
    txHash,
  }
}

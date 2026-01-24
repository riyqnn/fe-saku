"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface TransferParams {
  receiverAddress: string
  amount: string
  receiverName?: string
}

export interface TransferResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  timestamp?: string
  error?: string
}

export function useTransfer() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const transfer = useCallback(
    async (params: TransferParams): Promise<TransferResult> => {
      try {
        setLoading(true)
        setError(null)
        setTxHash(null)

        // Validate inputs
        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.receiverAddress) {
          throw new Error("Receiver address is required")
        }

        if (!params.amount || isNaN(parseFloat(params.amount))) {
          throw new Error("Valid amount is required")
        }

        const amount = parseFloat(params.amount)
        if (amount <= 0) {
          throw new Error("Amount must be greater than 0")
        }

        // Call transfer API - server will decrypt private key
        const response = await fetch("/api/transfer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            receiverAddress: params.receiverAddress,
            amount: params.amount,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Transfer failed")
        }

        setTxHash(data.transactionHash)
        return {
          success: true,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          timestamp: data.timestamp,
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
    [user?.phone_number]
  )

  return {
    transfer,
    loading,
    error,
    txHash,
  }
}

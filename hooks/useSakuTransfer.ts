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
  gasUsed?: string
  amount?: string
  transferredTo?: string
  approvalTxHash?: string
  error?: string
}

export function useSakuTransfer() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const transferByPhone = useCallback(
    async (params: TransferByPhoneParams): Promise<TransferByPhoneResult> => {
      try {
        setLoading(true)
        setError(null)
        setTxHash(null)

        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.receiverPhone) {
          throw new Error("Receiver phone number is required")
        }

        if (!params.amount || isNaN(parseFloat(params.amount))) {
          throw new Error("Valid amount is required")
        }

        const amount = parseFloat(params.amount)
        if (amount <= 0) {
          throw new Error("Amount must be greater than 0")
        }

        // Call transfer API - server will decrypt private key and handle approval
        const response = await fetch("/api/transfer/phone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            receiverPhone: params.receiverPhone,
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
          amount: data.amount,
          transferredTo: data.transferredTo,
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
    transferByPhone,
    loading,
    error,
    txHash,
  }
}

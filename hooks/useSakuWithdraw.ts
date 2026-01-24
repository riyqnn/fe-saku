"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface WithdrawParams {
  toAddress: string
  amount?: string
  withdrawAll?: boolean
}

export interface WithdrawResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  amount?: string
  fee?: string
  amountAfterFee?: string
  approvalTxHash?: string
  error?: string
}

export function useSakuWithdraw() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const withdraw = useCallback(
    async (params: WithdrawParams): Promise<WithdrawResult> => {
      try {
        setLoading(true)
        setError(null)
        setTxHash(null)

        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.toAddress) {
          throw new Error("Destination address is required")
        }

        if (!params.amount && !params.withdrawAll) {
          throw new Error("Either amount or withdrawAll flag is required")
        }

        if (params.amount && isNaN(parseFloat(params.amount))) {
          throw new Error("Valid amount is required")
        }

        const amount = params.amount ? parseFloat(params.amount) : 0
        if (amount <= 0 && !params.withdrawAll) {
          throw new Error("Amount must be greater than 0")
        }

        // Call withdraw API - server will decrypt private key
        const response = await fetch("/api/withdraw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            toAddress: params.toAddress,
            amount: params.amount,
            withdrawAll: params.withdrawAll || false,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Withdrawal failed")
        }

        setTxHash(data.transactionHash)
        return {
          success: true,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          amount: data.amount,
          fee: data.fee,
          amountAfterFee: data.amountAfterFee,
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
    withdraw,
    loading,
    error,
    txHash,
  }
}

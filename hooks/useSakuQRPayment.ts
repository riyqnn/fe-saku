"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface CreateQRPaymentParams {
  merchantPhone: string
  amount: string
}

export interface ClaimQRPaymentParams {
  qrHash: string
}

export interface RefundQRPaymentParams {
  qrHash: string
}

export interface GetQRPaymentParams {
  qrHash: string
}

export interface CreateQRPaymentResult {
  success: boolean
  qrHash?: string
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  approvalTxHash?: string
  error?: string
}

export interface ClaimQRPaymentResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  amount?: string
  error?: string
}

export interface RefundQRPaymentResult {
  success: boolean
  transactionHash?: string
  blockNumber?: number
  gasUsed?: string
  amount?: string
  error?: string
}

export interface QRPaymentDetails {
  merchantHash: string
  payer: string
  amount: string
  timestamp: number
  claimed: boolean
  exists: boolean
  canRefund: boolean
  expiresAt: number
}

export interface GetQRPaymentResult {
  success: boolean
  payment?: QRPaymentDetails
  error?: string
}

export function useSakuQRPayment() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQRPayment = useCallback(
    async (params: CreateQRPaymentParams): Promise<CreateQRPaymentResult> => {
      try {
        setCreating(true)
        setError(null)

        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.merchantPhone || !params.amount) {
          throw new Error("Merchant phone and amount are required")
        }

        if (isNaN(parseFloat(params.amount)) || parseFloat(params.amount) <= 0) {
          throw new Error("Valid amount is required")
        }

        const response = await fetch("/api/qr-payment/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            merchantPhone: params.merchantPhone,
            amount: params.amount,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to create QR payment")
        }

        return {
          success: true,
          qrHash: data.qrHash,
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
        setCreating(false)
      }
    },
    [user]
  )

  const claimQRPayment = useCallback(
    async (params: ClaimQRPaymentParams): Promise<ClaimQRPaymentResult> => {
      try {
        setClaiming(true)
        setError(null)

        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.qrHash) {
          throw new Error("QR hash is required")
        }

        const response = await fetch("/api/qr-payment/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            qrHash: params.qrHash,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to claim QR payment")
        }

        return {
          success: true,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          amount: data.amount,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setClaiming(false)
      }
    },
    [user]
  )

  const refundQRPayment = useCallback(
    async (params: RefundQRPaymentParams): Promise<RefundQRPaymentResult> => {
      try {
        setRefunding(true)
        setError(null)

        if (!user?.phone_number) {
          throw new Error("User not authenticated")
        }

        if (!params.qrHash) {
          throw new Error("QR hash is required")
        }

        const response = await fetch("/api/qr-payment/refund", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: user.phone_number,
            qrHash: params.qrHash,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to refund QR payment")
        }

        return {
          success: true,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          amount: data.amount,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      } finally {
        setRefunding(false)
      }
    },
    [user]
  )

  const getQRPayment = useCallback(
    async (params: GetQRPaymentParams): Promise<GetQRPaymentResult> => {
      try {
        if (!params.qrHash) {
          throw new Error("QR hash is required")
        }

        const response = await fetch(`/api/qr-payment/get?qrHash=${encodeURIComponent(params.qrHash)}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to get QR payment details")
        }

        return {
          success: true,
          payment: data.payment,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      }
    },
    []
  )

  return {
    createQRPayment,
    claimQRPayment,
    refundQRPayment,
    getQRPayment,
    loading,
    creating,
    claiming,
    refunding,
    error,
  }
}

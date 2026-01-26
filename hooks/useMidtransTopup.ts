"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"

export interface TopupParams {
  amount: string
  paymentMethod: 'gopay' | 'ovo' | 'dana'
}

export interface TopupResult {
  success: boolean
  orderId?: string
  redirectUrl?: string
  token?: string
  error?: string
}

export function useMidtransTopup() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTopup = useCallback(
    async (params: TopupParams): Promise<TopupResult> => {
      try {
        setLoading(true)
        setError(null)

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

        const response = await fetch("/api/topup/create-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: params.amount,
            paymentMethod: params.paymentMethod,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to create topup")
        }

        return {
          success: true,
          orderId: data.orderId,
          redirectUrl: data.redirectUrl,
          token: data.token,
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
    createTopup,
    loading,
    error,
  }
}

export function useTopupStatus() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async (orderId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/topup/status/${orderId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check status")
      }

      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    checkStatus,
    loading,
    error,
  }
}

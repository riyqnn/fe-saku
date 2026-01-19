"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth"
import { useWallet } from "./useWallet"
import { supabase } from "@/lib/supabaseClient"
import { decrypt } from "@/utils/encrypt"
import { hashPhoneNumber } from "@/utils/phoneHash"

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
  const { address } = useWallet()
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
        if (!address || !user?.phone) {
          throw new Error("Wallet not initialized")
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

        // Fetch encrypted private key from database
        const phoneHash = hashPhoneNumber(user.phone)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("encrypted_private_key, encryption_iv, auth_tag")
          .eq("phone_hash", phoneHash)
          .single()

        if (profileError || !profile) {
          throw new Error("Could not retrieve wallet information")
        }

        // Decrypt private key
        let privateKey: string
        try {
          privateKey = decrypt(
            profile.encrypted_private_key,
            profile.encryption_iv,
            profile.auth_tag
          )
        } catch {
          throw new Error("Failed to decrypt private key")
        }

        // Call transfer API
        const response = await fetch("/api/transfer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            senderAddress: address,
            receiverAddress: params.receiverAddress,
            amount: params.amount,
            privateKey: privateKey,
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
    [address, user?.phone]
  )

  return {
    transfer,
    loading,
    error,
    txHash,
  }
}

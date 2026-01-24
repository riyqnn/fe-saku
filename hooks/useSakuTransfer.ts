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

// PASTIKAN ADA EXPORT FUNCTION INI:
export function useSakuTransfer() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const normalizePhone = (phone: string) => {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    return normalized;
  }

  const transferByPhone = useCallback(
    async (params: TransferByPhoneParams): Promise<TransferByPhoneResult> => {
      try {
        setLoading(true);
        setError(null);
        
        const rawPhone = user?.phone_number || localStorage.getItem('saku_user_phone');
        
        if (!rawPhone) {
          throw new Error("Phone number not found. Please log in again.");
        }

        const senderPhone = normalizePhone(rawPhone);
        const receiverPhone = normalizePhone(params.receiverPhone);

        const response = await fetch("/api/transfer/phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: senderPhone,
            receiverPhone: receiverPhone,
            amount: params.amount,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Transfer failed");
        }

        setTxHash(data.transactionHash);
        return {
          success: true,
          ...data
        };
      } catch (err: any) {
        const errorMessage = err.message || "Unknown error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
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
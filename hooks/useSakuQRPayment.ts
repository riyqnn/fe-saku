"use client"

import { useState, useCallback } from "react"
import { ethers } from "ethers"

/**
 * Saku QR Payment Hook
 * SECURE: Uses server-side API for transaction signing (no private key exposure)
 */
export function useSakuQRPayment() {
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Generate QR code data for payment request
   * Format: saku:transfer:<merchantPhone>:<amount>
   */
  const generateQR = useCallback(async (merchantPhone: string, amount: string) => {
    const qrData = `saku:transfer:${merchantPhone}:${amount}`;
    return { success: true, qrHash: qrData };
  }, []);

  /**
   * Claim/Execute QR payment via server-side API
   * Transaction is signed on the server (private key never exposed to client)
   */
  const claimPayment = useCallback(async (qrData: string) => {
    try {
      const parts = qrData.split(':');
      if (parts.length < 4) throw new Error("Format QR gak bener bos");

      const merchantPhone = parts[2];
      const amount = parts[3];

      setIsLoading(true);

      // Call server-side API for secure transaction signing
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('saku_auth_token')}`
        },
        body: JSON.stringify({
          receiverPhone: merchantPhone,
          amount: amount
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      return { success: true, transactionHash: result.transactionHash };
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateQR,
    claimPayment,
    loading: isLoading
  };
}
"use client"

import { useState, useCallback, useMemo } from "react"
import { ethers } from "ethers"
import { useRegistry } from "./useRegistry"
import { getProvider } from "@/lib/blockchain"

export function useSakuQRPayment() {
  const signer = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const pKey = localStorage.getItem('saku_private_key'); 
    if (!pKey) return null;
    try {
      return new ethers.Wallet(pKey, getProvider());
    } catch { return null; }
  }, []);

  const { transferByPhone, isLoading } = useRegistry(signer);

  const generateQR = useCallback(async (merchantPhone: string, amount: string) => {
    const qrData = `saku:transfer:${merchantPhone}:${amount}`;
    return { success: true, qrHash: qrData }; 
  }, []);

  const claimPayment = useCallback(async (qrData: string) => {
    if (!signer) throw new Error("Wallet tidak siap");
    
    try {
      const parts = qrData.split(':');
      if (parts.length < 4) throw new Error("Format QR gak bener bos");
      
      const merchantPhone = parts[2];
      const amount = parts[3];
      const amountRaw = ethers.parseUnits(amount, 6);

      const result = await transferByPhone(merchantPhone, amountRaw);
      
      return { success: true, transactionHash: result.hash };
    } catch (err: any) {
      throw err;
    }
  }, [transferByPhone, signer]);

  return {
    generateQR,
    claimPayment,
    loading: isLoading
  };
}
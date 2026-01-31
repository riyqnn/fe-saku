"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./useAuth" // Kita butuh ini untuk ambil data pengirim (user.phone_number)

/**
 * Saku QR Payment Hook (Updated)
 * Menggunakan route /api/transfer/phone
 */
export function useSakuQRPayment() {
  // Ambil user dan token dari hook auth agar konsisten dengan useSakuTransfer
  const { user, token } = useAuth() 
  const [isLoading, setIsLoading] = useState(false)

  // Helper untuk membersihkan nomor HP (Opsional, tapi praktik baik agar data bersih dikirim ke API)
  const normalizePhone = (phone: string) => {
    let normalized = phone.replace(/\D/g, '')
    if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1)
    return normalized
  }

  /**
   * Generate QR code data
   * Format: saku:transfer:<merchantPhone>:<amount>
   */
  const generateQR = useCallback(async (merchantPhone: string, amount: string) => {
    // Pastikan nomor merchant bersih sebelum dibuat QR
    const cleanMerchantPhone = normalizePhone(merchantPhone)
    const qrData = `saku:transfer:${cleanMerchantPhone}:${amount}`;
    return { success: true, qrHash: qrData };
  }, []);

  /**
   * Claim/Execute QR payment
   */
  const claimPayment = useCallback(async (qrData: string) => {
    try {
      setIsLoading(true);

      // 1. Validasi User Login
      if (!user?.phone_number || !token) {
        throw new Error("User tidak ditemukan. Silakan login ulang.");
      }

      // 2. Parse Data QR
      const parts = qrData.split(':');
      if (parts.length < 4) throw new Error("Format QR tidak valid");

      const merchantPhone = parts[2];
      const amount = parts[3];

      // 3. Persiapkan Data Pengirim
      // Backend mewajibkan field 'phoneNumber' sebagai pengirim di dalam Body
      const senderPhone = normalizePhone(user.phone_number);

      // 4. Panggil API Backend (/api/transfer/phone)
      const response = await fetch('/api/transfer/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Menggunakan token dari useAuth
        },
        body: JSON.stringify({
          phoneNumber: senderPhone, // INI WAJIB ADA sesuai backend kamu
          receiverPhone: merchantPhone,
          amount: amount
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Pembayaran gagal');
      }

      return { success: true, transactionHash: result.transactionHash };

    } catch (err: any) {
      // Re-throw error agar bisa ditangkap di UI (toast)
      throw err; 
    } finally {
      setIsLoading(false);
    }
  }, [user, token]); // Dependency array penting agar user/token selalu update

  return {
    generateQR,
    claimPayment,
    loading: isLoading
  };
}
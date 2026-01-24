'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { hashPhoneNumber } from '@/utils/phoneHash';

export default function SetupWalletFlow() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Input Phone, 2: OTP, 3: Processing
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      // Logic request OTP bisa ditaruh di sini
      setStep(2);
    } catch (err) {
      alert('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      // Use the same hash library as the backend
      const phoneHash = hashPhoneNumber(phone); 

      const res = await fetch('/api/setup-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          phone_hash: phoneHash
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStep(3);
        setTimeout(() => router.push('/home'), 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {step === 1 && "Verifikasi Nomor HP"}
            {step === 2 && "Masukkan OTP"}
            {step === 3 && "Menyiapkan Dompet Digital"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <Input 
                placeholder="Contoh: 08123456789" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button className="w-full" onClick={handleStartSetup} disabled={loading}>
                {loading ? "Mengirim..." : "Lanjutkan"}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Input placeholder="6 Digit OTP" maxLength={6} className="text-center text-2xl tracking-widest" />
              <Button className="w-full" onClick={handleVerifyOTP} disabled={loading}>
                {loading ? "Memverifikasi..." : "Verifikasi & Buat Wallet"}
              </Button>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Mengenkripsi kunci dan mendaftarkan ke blockchain...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
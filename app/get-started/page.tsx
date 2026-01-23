"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"

export default function LoginScreen() {
  const router = useRouter()
  const { refreshUser } = useAuth() 

  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""))
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const formatPhone = (num: string) => {
    const cleanNum = num.replace(/\D/g, '')
    return cleanNum.startsWith('0') ? `+62${cleanNum.slice(1)}` : `+62${cleanNum}`
  }

  const handleSendOtp = async () => {
    if (phone.length < 10) return alert("Nomor HP minimal 10 digit co")
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatPhone(phone),
      })
      if (error) throw error
      setLoginMethod("otp")
    } catch (error: any) {
      alert("Gagal kirim OTP: " + (error.message || "Cek kuota/koneksi"))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const otpString = otp.join("");
      const formattedPhone = formatPhone(phone);
      
      // 1. Verifikasi OTP (Client Side)
      // Di dalam handleVerifyOtp (page.tsx)
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpString,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      // Ambil UID langsung dari authData
      const userId = authData.user?.id;

      // Kirim UID ke API agar API tidak mendapatkan 'null'
      const res = await fetch('/api/auth', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: formattedPhone,
          uid: userId // KIRIM INI SEBAGAI BACKUP
        }),
      });
      
      const result = await res.json();
      
      // Jika API Auth gagal, jangan lanjut redirect!
      if (!res.ok) throw new Error(result.error || "Gagal sinkronisasi backend");

      console.log("✅ Success Auth & On-chain:", result);
      
      // 4. Update Global State
      await refreshUser();

      // Kasih feedback visual sebelum pindah
      alert(result.isNewUser ? "🚀 Wallet created on-chain!" : "👋 Welcome back!");
      
      router.replace('/home'); 
      
    } catch (error: any) {
      alert("Error: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false
    const newOtp = [...otp]
    newOtp[index] = element.value
    setOtp(newOtp)
    if (element.value !== "" && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
      <div className="w-full max-w-md space-y-8">
        {/* STEP 1: WELCOME */}
        {loginMethod === null && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full max-w-sm flex items-center justify-center overflow-hidden">
                <video autoPlay loop muted playsInline className="w-full h-full object-contain mix-blend-multiply" style={{ maxHeight: '400px' }}>
                  <source src="/logo.webm" type="video/webm" />
                </video>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-[#000000]">Welcome to Saku</h2>
                <p className="text-[#7F8790] text-sm max-w-xs mx-auto">Sistem keuangan blockchain termudah.</p>
              </div>
            </div>
            <div className="space-y-3 mt-8">
              <button onClick={() => setLoginMethod("phone")} className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold shadow-lg active:scale-95 transition-all">Login</button>
              <button onClick={() => setLoginMethod("phone")} className="w-full px-6 py-4 bg-white text-[#000000] rounded-2xl font-semibold border-2 border-[#F8F8F8] shadow-sm active:scale-95 transition-all">Sign Up</button>
            </div>
          </div>
        )}

        {/* STEP 2: PHONE INPUT */}
        {loginMethod === "phone" && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <button onClick={() => setLoginMethod(null)} className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-[#000000]">Phone Number</h2>
              <p className="text-[#7F8790]">Kita bakal kirim kode OTP ke nomor lo.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#000000]">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7F8790] font-medium">+62</span>
                <input type="tel" value={phone} autoFocus onChange={(e) => setPhone(e.target.value)} placeholder="812 3456 7890" className="w-full pl-16 pr-5 py-4 bg-white border-2 border-[#F8F8F8] rounded-2xl text-lg focus:outline-none focus:border-[#7F8790]" />
              </div>
            </div>
            <button onClick={handleSendOtp} disabled={phone.length < 10 || loading} className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold disabled:opacity-40">{loading ? "Sending..." : "Continue"}</button>
          </div>
        )}

        {/* STEP 3: OTP INPUT */}
        {loginMethod === "otp" && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <button onClick={() => setLoginMethod("phone")} className="flex items-center text-[#7F8790] hover:text-[#000000]"><svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Back</button>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-[#000000]">Enter OTP</h2>
              <p className="text-[#7F8790]">Kode dikirim ke <span className="font-semibold text-[#000000]">+62 {phone}</span></p>
            </div>
            <div className="flex justify-center gap-3">
              {otp.map((data, i) => (
                <input key={i} type="text" maxLength={1} ref={(el) => { inputRefs.current[i] = el }} value={data} onChange={(e) => handleOtpChange(e.target, i)} onKeyDown={(e) => handleKeyDown(e, i)} className="w-12 h-14 bg-white border-2 border-[#F8F8F8] rounded-2xl text-center font-bold text-xl focus:border-[#7F8790] outline-none" />
              ))}
            </div>
            <button onClick={handleVerifyOtp} disabled={otp.some(v => v === "") || loading} className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold disabled:opacity-40">{loading ? "Verifying..." : "Verify"}</button>
          </div>
        )}
      </div>
    </div>
  )
}
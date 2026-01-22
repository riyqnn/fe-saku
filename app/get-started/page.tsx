"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/context/AuthContext"

export default function LoginScreen() {
  const router = useRouter()
  
  // Ambil fungsi dan state dari AuthContext
  const { login, requestOTP, isAuthenticated, isLoading: authLoading } = useAuthContext()

  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""))
  const [localLoading, setLocalLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // 1. PROTEKSI REDIRECT: Jika sudah login, langsung lempar ke /home
  // Gunakan replace agar user tidak bisa klik tombol 'back' ke halaman login
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, authLoading, router])

  // 2. PROTEKSI RENDER: Jika masih loading atau sudah login, jangan tampilkan form sama sekali
  // Ini kunci agar tidak terjadi "glitch" form muncul sedetik
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="animate-pulse text-[#7F8790] font-medium">Checking session...</div>
      </div>
    )
  }

  const handleSendOtp = async () => {
    setLocalLoading(true)
    try {
      await requestOTP(phone)
      setLoginMethod("otp")
    } catch (error: any) {
      alert(error.message || "Failed to send code.")
    } finally {
      setLocalLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLocalLoading(true)
    try {
      const otpString = otp.join("")
      const result = await login(phone, otpString)

      if (result.success) {
        // Redirect ke home setelah sukses
        router.replace('/home')
      }
    } catch (error: any) {
      alert(error.message || "Verification failed")
    } finally {
      setLocalLoading(false)
    }
  }

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false
    const newOtp = [...otp]
    newOtp[index] = element.value
    setOtp(newOtp)
    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }
 
  // RENDER UI FORM
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
      <div className="w-full max-w-md space-y-8">
        
        {/* STEP 1: WELCOME SCREEN */}
        {loginMethod === null && (
          <>
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full max-w-sm flex items-center justify-center overflow-hidden">
                <video autoPlay loop muted playsInline className="w-full h-full object-contain mix-blend-multiply" style={{ maxHeight: '400px' }}>
                  <source src="/logo.webm" type="video/webm" />
                </video>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-[#000000]">Welcome to Saku</h2>
                <p className="text-[#7F8790] text-sm max-w-xs mx-auto">
                  Manage your finances easily and securely
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setLoginMethod("phone")}
                className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 transition-all duration-200 shadow-lg"
              >
                Login
              </button>
              <button
                onClick={() => setLoginMethod("phone")}
                className="w-full px-6 py-4 bg-white text-[#000000] rounded-2xl font-semibold border-2 border-[#F8F8F8] hover:border-[#7F8790] transition-all duration-200 shadow"
              >
                Sign Up
              </button>
            </div>
          </>
        )}

        {/* STEP 2: PHONE INPUT */}
        {loginMethod === "phone" && (
          <div className="space-y-8">
            <button onClick={() => setLoginMethod(null)} className="flex items-center text-[#7F8790] hover:text-[#000000]">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-[#000000]">Phone Number</h2>
              <p className="text-[#7F8790]">We will send an OTP code to your number</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#000000]">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7F8790] font-medium">+62</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="812 3456 7890"
                  className="w-full pl-16 pr-5 py-4 bg-white border-2 border-[#F8F8F8] rounded-2xl text-lg focus:outline-none focus:border-[#7F8790]"
                />
              </div>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={phone.length < 10 || localLoading}
              className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold disabled:opacity-40"
            >
              {localLoading ? "Sending..." : "Continue"}
            </button>
          </div>
        )}

        {/* STEP 3: OTP INPUT */}
        {loginMethod === "otp" && (
          <div className="space-y-8">
            <button onClick={() => setLoginMethod("phone")} className="flex items-center text-[#7F8790]">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-[#000000]">Enter OTP</h2>
              <p className="text-[#7F8790]">Code sent to <span className="font-semibold">+62 {phone}</span></p>
            </div>

            <div className="flex justify-center gap-3">
              {otp.map((data, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  ref={(el) => { inputRefs.current[i] = el }}
                  value={data}
                  onChange={(e) => handleOtpChange(e.target, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className="w-12 h-14 bg-white border-2 border-[#F8F8F8] rounded-2xl text-center font-bold text-xl focus:outline-none focus:border-[#7F8790]"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={otp.some(v => v === "") || localLoading}
              className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold disabled:opacity-40"
            >
              {localLoading ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
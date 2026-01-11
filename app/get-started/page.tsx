"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginScreen() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""))
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleSendOtp = async () => {
    setLoading(true)
    try {
      const formattedPhone = phone.startsWith('0') ? `+62${phone.slice(1)}` : `+62${phone}`
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })
      if (error) throw error
      setLoginMethod("otp")
    } catch (error: any) {
      alert(error.message || "Failed to send code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    try {
      const otpString = otp.join("")
      const formattedPhone = phone.startsWith('0') ? `+62${phone.slice(1)}` : `+62${phone}`
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpString,
        type: 'sms',
      })

      if (verifyError) throw verifyError

      const res = await fetch('/api/auth', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      alert(result.isNewUser ? "Wallet Created Successfully!" : "Welcome Back!")
      router.push('/')
    } catch (error: any) {
      alert(error.message || "Verification failed")
    } finally {
      setLoading(false)
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
 
  if (loginMethod === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
        <div className="w-full max-w-md space-y-8">
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
              className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Login
            </button>
            <button
              onClick={() => setLoginMethod("phone")}
              className="w-full px-6 py-4 bg-white text-[#000000] rounded-2xl font-semibold border-2 border-[#F8F8F8] hover:border-[#7F8790] transition-all duration-200 shadow hover:shadow-md"
            >
              Sign Up
            </button>
          </div>

          {/* <p className="text-center text-xs text-[#8F92A1] mt-8">
            By continuing, you agree to our{" "}
            <span className="text-[#000000] font-medium underline cursor-pointer">Terms & Conditions</span>
          </p> */}
        </div>
      </div>
    )
  }

  if (loginMethod === "phone") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
        <div className="w-full max-w-md space-y-8">
          <button onClick={() => setLoginMethod(null)} className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors">
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
                className="w-full pl-16 pr-5 py-4 bg-white border-2 border-[#F8F8F8] rounded-2xl text-[#000000] placeholder-[#8F92A1] focus:outline-none focus:border-[#7F8790] transition-colors text-lg"
              />
            </div>
          </div>

          <button
            onClick={handleSendOtp}
            disabled={phone.length < 10 || loading}
            className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-8"
          >
            {loading ? "Sending..." : "Continue"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
      <div className="w-full max-w-md space-y-8">
        <button onClick={() => setLoginMethod("phone")} className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-[#000000]">Enter OTP</h2>
          <p className="text-[#7F8790]">
            Verification code has been sent to<br />
            <span className="font-semibold text-[#000000]">+62 {phone}</span>
          </p>
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
              className="w-12 h-14 sm:w-14 sm:h-14 bg-white border-2 border-[#F8F8F8] rounded-2xl text-center font-bold text-[#000000] text-xl focus:outline-none focus:border-[#7F8790] transition-colors shadow-sm"
            />
          ))}
        </div>

        {/* <div className="text-center space-y-4">
          <p className="text-sm text-[#7F8790]">
            Didn't receive the code?{" "}
            <button onClick={handleSendOtp} className="text-[#000000] font-semibold hover:underline">
              Resend
            </button>
          </p>
          <p className="text-xs text-[#8F92A1]">
            Code will expire in <span className="font-semibold text-[#000000]">02:00</span>
          </p>
        </div> */}

        <button
          onClick={handleVerifyOtp}
          disabled={otp.some(v => v === "") || loading}
          className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 disabled:opacity-40 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-8"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  )
}
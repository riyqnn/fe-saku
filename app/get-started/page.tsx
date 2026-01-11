"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handlePhoneSubmit = () => {
    if (phone.length >= 10) {
      setLoginMethod("otp")
    }
  }

  const handleVerifyOTP = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/setup-wallet', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success || data.message === 'User already registered') {
        router.push('/dashboard')
      } else {
        throw new Error(data.error || "Failed to setup wallet")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (loginMethod === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-sm flex items-center justify-center overflow-hidden">
              <video
                autoPlay loop muted playsInline
                className="w-full h-full object-contain mix-blend-multiply"
                style={{ maxHeight: '400px' }}
              >
                <source src="/logo.webm" type="video/webm" />
              </video>
            </div>
            
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-[#000000]">Welcome to Saku</h2>
              <p className="text-[#7F8790] text-sm max-w-xs mx-auto">
                Manage your finances with ease and cryptographic security
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setLoginMethod("phone")}
              className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Sign In
            </button>
            <button
              onClick={() => setLoginMethod("phone")}
              className="w-full px-6 py-4 bg-white text-[#000000] rounded-2xl font-semibold border-2 border-[#F8F8F8] hover:border-[#7F8790] transition-all duration-200 shadow hover:shadow-md"
            >
              Create Account
            </button>
          </div>

          <p className="text-center text-xs text-[#8F92A1] mt-8">
            By continuing, you agree to our{" "}
            <span className="text-[#000000] font-medium underline cursor-pointer">Terms & Conditions</span>
          </p>
        </div>
      </div>
    )
  }

  if (loginMethod === "phone") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
        <div className="w-full max-w-md space-y-8">
          <button
            onClick={() => setLoginMethod(null)}
            className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#000000]">Enter Phone Number</h2>
            <p className="text-[#7F8790]">We will send a verification code to your device</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#000000]">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7F8790] font-medium">
                +62
              </span>
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
            onClick={handlePhoneSubmit}
            disabled={phone.length < 10}
            className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none mt-8"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
      <div className="w-full max-w-md space-y-8">
        <button
          onClick={() => setLoginMethod("phone")}
          className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-[#000000]">Verify Identity</h2>
          <p className="text-[#7F8790]">
            Verification code sent to<br />
            <span className="font-semibold text-[#000000]">+62 {phone}</span>
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {[...Array(6)].map((_, i) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              className="w-14 h-14 bg-white border-2 border-[#F8F8F8] rounded-2xl text-center font-bold text-[#000000] text-xl focus:outline-none focus:border-[#7F8790] transition-colors shadow-sm"
              onInput={(e) => {
                const target = e.target as HTMLInputElement
                if (target.value && target.nextElementSibling) {
                  (target.nextElementSibling as HTMLInputElement).focus()
                }
              }}
            />
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-[#7F8790]">
            Didn&apos;t receive the code?{" "}
            <button className="text-[#000000] font-semibold hover:underline">
              Resend Code
            </button>
          </p>
          <p className="text-xs text-[#8F92A1]">
            Code expires in <span className="font-semibold text-[#000000]">02:00</span>
          </p>
        </div>

        <button
          onClick={handleVerifyOTP}
          disabled={isLoading}
          className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-8 disabled:opacity-50"
        >
          {isLoading ? "Securing Wallet..." : "Verify & Continue"}
        </button>
      </div>
    </div>
  )
}
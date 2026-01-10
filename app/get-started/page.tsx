"use client"

import React, { useState } from "react"

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")

  const handleComplete = () => {
    alert('Login berhasil! (Demo)')
  }

  const handlePhoneSubmit = () => {
    if (phone.length >= 10) {
      setLoginMethod("otp")
    }
  }

  const handleSocialLogin = () => {
    handleComplete()
  }

  if (loginMethod === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
        <div className="w-full max-w-md space-y-8">
          {/* Illustration Area with Video */}
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-sm flex items-center justify-center overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain mix-blend-multiply"
                style={{ maxHeight: '400px' }}
              >
                <source src="/logo.webm" type="video/webm" />
              </video>
            </div>
            
            {/* Title Section */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-[#000000]">Selamat Datang di Saku</h2>
              <p className="text-[#7F8790] text-sm max-w-xs mx-auto">
                Kelola keuangan Anda dengan mudah dan aman
              </p>
            </div>
          </div>

          {/* Buttons */}
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

          {/* Footer */}
          <p className="text-center text-xs text-[#8F92A1] mt-8">
            Dengan melanjutkan, Anda menyetujui{" "}
            <span className="text-[#000000] font-medium">Syarat & Ketentuan</span>
          </p>
        </div>
      </div>
    )
  }

  if (loginMethod === "phone") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
        <div className="w-full max-w-md space-y-8">
          {/* Back Button */}
          <button
            onClick={() => setLoginMethod(null)}
            className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>

          {/* Title */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#000000]">Masuk dengan Nomor HP</h2>
            <p className="text-[#7F8790]">Kami akan mengirim kode OTP ke nomor Anda</p>
          </div>

          {/* Phone Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#000000]">Nomor Handphone</label>
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

          {/* Submit Button */}
          <button
            onClick={handlePhoneSubmit}
            disabled={phone.length < 10}
            className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none mt-8"
          >
            Lanjutkan
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[#F8F8F8]"></div>
            <span className="text-sm text-[#8F92A1]">atau</span>
            <div className="flex-1 h-px bg-[#F8F8F8]"></div>
          </div>

          {/* Social Login */}
          <button
            onClick={handleSocialLogin}
            className="w-full px-6 py-4 bg-white text-[#000000] rounded-2xl font-semibold border-2 border-[#F8F8F8] hover:border-[#7F8790] transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Lanjutkan dengan Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
      <div className="w-full max-w-md space-y-8">
        {/* Back Button */}
        <button
          onClick={() => setLoginMethod("phone")}
          className="flex items-center text-[#7F8790] hover:text-[#000000] transition-colors"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>

        {/* Title */}
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-[#000000]">Masukkan Kode OTP</h2>
          <p className="text-[#7F8790]">
            Kode verifikasi telah dikirim ke<br />
            <span className="font-semibold text-[#000000]">+62 {phone}</span>
          </p>
        </div>

        {/* OTP Inputs */}
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

        {/* Timer and Resend */}
        <div className="text-center space-y-4">
          <p className="text-sm text-[#7F8790]">
            Tidak menerima kode?{" "}
            <button className="text-[#000000] font-semibold hover:underline">
              Kirim ulang
            </button>
          </p>
          <p className="text-xs text-[#8F92A1]">
            Kode akan kadaluarsa dalam <span className="font-semibold text-[#000000]">02:00</span>
          </p>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleSocialLogin}
          className="w-full px-6 py-4 bg-[#000000] text-white rounded-2xl font-semibold hover:bg-[#000000]/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-8"
        >
          Verifikasi
        </button>
      </div>
    </div>
  )
}
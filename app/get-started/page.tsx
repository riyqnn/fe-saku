"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import CountryCodeDropdown from "@/components/get-started/country-code-dropdown"

export default function LoginScreen() {
  const router = useRouter()
  const { refreshUser, isAuthenticated, isLoading, setToken } = useAuth() 

  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")
  const [selectedCountryCode, setSelectedCountryCode] = useState("+62")
  const [otp, setOtp] = useState<string[]>(new Array(4).fill(""))
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/home')
    }
  }, [isAuthenticated, isLoading, router])

  const formatPhone = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    const countryCode = selectedCountryCode.replace('+', '');
    // If number starts with 0, replace it with country code
    if (cleanNum.startsWith('0')) {
      return `${countryCode}${cleanNum.slice(1)}`;
    }
    // If number already starts with country code, do nothing
    if (cleanNum.startsWith(countryCode)) {
      return cleanNum;
    }
    // Otherwise, prepend country code
    return `${countryCode}${cleanNum}`;
  }

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      return toast.error("Phone number must be at least 10 digits");
    }
    
    setLoading(true);
    
    toast.promise(
      fetch('/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatPhone(phone), countryCode: selectedCountryCode.replace('+', '') }),
      }).then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to send OTP");
        setLoginMethod("otp");
        return result;
      }),
      {
        loading: 'Sending verification code...',
        success: 'OTP sent to your WhatsApp! 📲',
        error: (err) => err.message,
      }
    );
    
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);

    toast.promise(
      (async () => {
        const otpString = otp.join("");
        const formattedPhone = formatPhone(phone);
        
        const res = await fetch('/api/verify-otp', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: formattedPhone,
            otp: otpString
          }),
        });
        
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Verification failed");

        if (result.isNewRegistration) {
          localStorage.setItem("saku_just_registered", "true");
        }

        localStorage.setItem('saku_auth_token', result.token);
        setToken(result.token);

        await refreshUser();
        router.replace('/home');
        
        return result;
      })(),
      {
        loading: 'Verifying and securing your wallet...',
        success: (data) => data.isNewRegistration 
          ? "Wallet created successfully on-chain!" 
          : "Welcome back to Saku!",
        error: (err) => err.message,
      }
    );

    setLoading(false);
  };

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false
    const newOtp = [...otp]
    newOtp[index] = element.value
    setOtp(newOtp)
    
    if (element.value !== "" && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9EFE5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5] font-sans">
      <div className="w-full max-w-md space-y-8">
        {loginMethod === null && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full max-w-sm flex items-center justify-center overflow-hidden">
                <video autoPlay loop muted playsInline className="w-full h-full object-contain mix-blend-multiply" style={{ maxHeight: '400px' }}>
                  <source src="/logo.webm" type="video/webm" />
                </video>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-black text-black">Welcome to Saku</h2>
                <p className="text-[#7F8790] text-sm max-w-xs mx-auto">The easiest non-custodial blockchain wallet.</p>
              </div>
            </div>
            <div className="space-y-3 mt-8">
              <button onClick={() => setLoginMethod("phone")} className="w-full px-6 py-4 bg-black text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">Sign In</button>
              <button onClick={() => setLoginMethod("phone")} className="w-full px-6 py-4 bg-white text-black rounded-2xl font-bold border-2 border-black/5 shadow-sm active:scale-95 transition-all">Create Account</button>
            </div>
          </div>
        )}

        {loginMethod === "phone" && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <button onClick={() => setLoginMethod(null)} className="flex items-center text-[#7F8790] font-bold hover:text-black transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Go Back
            </button>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-black leading-tight">Phone Number</h2>
              <p className="text-[#7F8790]">We will send a verification code to your WhatsApp.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-black">Mobile Number</label>
              <div className="relative">
                <CountryCodeDropdown onSelect={setSelectedCountryCode} selectedCode={selectedCountryCode} />
                <input type="tel" value={phone} autoFocus onChange={(e) => setPhone(e.target.value)} placeholder="812 3456 7890" className="w-full pl-32 pr-5 py-4 bg-white border-2 border-black/5 rounded-2xl text-lg font-bold focus:outline-none focus:border-black transition-all" />
              </div>
            </div>
            <button onClick={handleSendOtp} disabled={phone.length < 10 || loading} className="w-full px-6 py-4 bg-black text-white rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">{loading ? "Sending..." : "Continue"}</button>
          </div>
        )}

        {loginMethod === "otp" && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
            <button onClick={() => setLoginMethod("phone")} className="flex items-center text-[#7F8790] font-bold hover:text-black transition-colors"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>Change Number</button>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-black leading-tight">Verify Identity</h2>
              <p className="text-[#7F8790]">Enter the 4-digit code sent to <span className="font-bold text-black">{selectedCountryCode} {phone}</span></p>
            </div>
            <div className="flex justify-center gap-4">
              {otp.map((data, i) => (
                <input 
                  key={i} 
                  type="text" 
                  maxLength={1} 
                  ref={(el) => { inputRefs.current[i] = el }} 
                  value={data} 
                  onChange={(e) => handleOtpChange(e.target, i)} 
                  onKeyDown={(e) => handleKeyDown(e, i)} 
                  className="w-14 h-16 bg-white border-2 border-black/5 rounded-2xl text-center font-black text-2xl focus:border-black outline-none transition-all" 
                />
              ))}
            </div>
            <button onClick={handleVerifyOtp} disabled={otp.some(v => v === "") || loading} className="w-full px-6 py-4 bg-black text-white rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">{loading ? "Verifying..." : "Verify"}</button>
          </div>
        )}
      </div>
    </div>
  )
}
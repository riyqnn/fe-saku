"use client"

import React, { useState, useEffect, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth"

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<"phone" | "otp" | null>(null)
  const [phone, setPhone] = useState("")
  const [otpValue, setOtpValue] = useState("")
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const container = document.getElementById('recaptcha-container');
    if (container && !recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
             console.log("reCAPTCHA solved");
          }
        });
      } catch (err) {
        console.error("Recaptcha Init Error:", err);
      }
    }

    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (phone.length < 10 || isPending || !recaptchaVerifierRef.current) return;

    startTransition(async () => {
      try {
        const formattedPhone = `+62${phone}`;
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current!);
        setConfirmationResult(confirmation);
        setLoginMethod("otp");
      } catch (error: any) {
        console.error("SMS Error:", error);
        if (error.message.includes('removed')) {
            window.location.reload();
        }
        alert(error.message);
      }
    });
  };

  const handleVerifyOTP = async () => {
    if (!otpValue || otpValue.length < 6 || !confirmationResult || isPending) return;

    startTransition(async () => {
      try {
        const result = await confirmationResult.confirm(otpValue);
        const idToken = await result.user.getIdToken();

        const response = await fetch('/api/setup-wallet', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        if (data.success) {
          router.push('/');
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        alert(err.message || "OTP Invalid");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F9EFE5]">
      <div id="recaptcha-container" style={{ visibility: 'hidden', position: 'absolute' }}></div>

      <div className="w-full max-w-md space-y-8">
        {loginMethod === null && (
          <div className="flex flex-col items-center space-y-10">
            <div className="w-full max-w-sm flex items-center justify-center overflow-hidden">
              <video autoPlay loop muted playsInline className="w-full h-full mix-blend-multiply max-h-[400px]">
                <source src="/logo.webm" type="video/webm" />
              </video>
            </div>
            
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-[#000000]">Welcome to Saku</h2>
              <p className="text-[#7F8790] text-sm max-w-xs mx-auto">
                Manage your finances with ease and cryptographic security
              </p>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={() => setLoginMethod("phone")}
                className="w-full px-6 py-4 bg-black text-white rounded-2xl font-semibold hover:bg-black/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
              <button
                onClick={() => setLoginMethod("phone")}
                className="w-full px-6 py-4 bg-white text-black rounded-2xl font-semibold border-2 border-[#F8F8F8] hover:border-[#7F8790] transition-all duration-200 shadow hover:shadow-md"
              >
                Create Account
              </button>
            </div>

            <p className="text-center text-xs text-[#8F92A1]">
              By continuing, you agree to our{" "}
              <span className="text-[#000000] font-medium underline cursor-pointer">Terms & Conditions</span>
            </p>
          </div>
        )}

        {loginMethod === "phone" && (
          <div className="space-y-8">
            <button onClick={() => setLoginMethod(null)} className="flex items-center text-[#7F8790] hover:text-black transition-colors">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-black">Enter Phone</h2>
              <p className="text-[#7F8790]">We will send a verification code to your device</p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-black">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7F8790] font-medium">+62</span>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="w-full pl-16 pr-5 py-4 bg-white border-2 border-[#F8F8F8] rounded-2xl text-black focus:outline-none focus:border-[#7F8790] transition-colors text-lg"
                    placeholder="812 3456 7890" 
                  />
                </div>
              </div>

              <button 
                disabled={isPending || phone.length < 10} 
                className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-black/90 disabled:opacity-40 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isPending ? "Sending SMS..." : "Continue"}
              </button>
            </form>
          </div>
        )}

        {loginMethod === "otp" && (
          <div className="space-y-8">
            <button onClick={() => setLoginMethod("phone")} className="flex items-center text-[#7F8790] hover:text-black transition-colors">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-black">Verify Identity</h2>
              <p className="text-[#7F8790]">Verification code sent to <span className="font-semibold text-black">+62 {phone}</span></p>
            </div>

            <div className="flex justify-center gap-3">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="otp-input w-12 h-14 bg-white border-2 border-[#F8F8F8] rounded-xl text-center text-xl font-bold text-black focus:outline-none focus:border-[#7F8790] transition-colors shadow-sm"
                  onInput={(e: any) => {
                    if (e.target.value && e.target.nextElementSibling) e.target.nextElementSibling.focus();
                    const inputs = document.querySelectorAll('.otp-input');
                    const val = Array.from(inputs).map((inpt: any) => (inpt as HTMLInputElement).value).join('');
                    setOtpValue(val);
                  }}
                />
              ))}
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-[#7F8790]">
                Didn&apos;t receive the code?{" "}
                <button onClick={handlePhoneSubmit} className="text-black font-semibold hover:underline">Resend Code</button>
              </p>
            </div>

            <button 
              onClick={handleVerifyOTP} 
              disabled={isPending || otpValue.length < 6} 
              className="w-full py-4 bg-black text-white rounded-2xl font-semibold hover:bg-black/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isPending ? "Securing Wallet..." : "Verify & Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
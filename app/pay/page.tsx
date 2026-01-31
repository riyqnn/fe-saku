"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  QrCode, Scan, CheckCircle, Loader2, 
  Camera, X, Wallet, Sparkles, Copy, Check
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react" 
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"
import Header from "@/components/layout/Header"

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { generateQR, claimPayment, loading: qrLoading } = useSakuQRPayment()
  const { formattedBalance, refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [activeTab, setActiveTab] = useState<"receive" | "pay">("receive")

  const [amount, setAmount] = useState("")
  const [qrData, setQrData] = useState<string | null>(null)
  const [payInput, setPayInput] = useState("")
  const [success, setSuccess] = useState(false)
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isTransitioning = useRef(false)

  const startScanner = async () => {
    if (isTransitioning.current) return
    
    try {
      const element = document.getElementById("reader")
      if (!element) return

      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode
      setIsScannerActive(true)

      const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
      }

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (text) => { 
          setPayInput(text)
          toast.success("QR Detected! ✅")
          stopScanner() 
        },
        () => {}
      )
    } catch (err) { 
      setIsScannerActive(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning && !isTransitioning.current) {
      isTransitioning.current = true
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
        setIsScannerActive(false)
      } catch (err) {
        console.error("Scanner stop error:", err)
      } finally {
        isTransitioning.current = false
      }
    }
  }

  const handleCopy = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData)
      setIsCopied(true)
      toast.success("Payment code copied! 📋")
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  useEffect(() => {
    if (activeTab === "pay") {
      const timer = setTimeout(() => startScanner(), 400) 
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }
  }, [activeTab])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const handleClaimPayment = async () => {
    if (!payInput) return toast.error("Scan QR dulu bos")
    
    toast.promise(claimPayment(payInput), {
      loading: 'Securing transaction on-chain...',
      success: (result) => {
        setSuccess(true)
        refetchBalance()
        return "Payment successful! 💸"
      },
      error: (err) => err.message || "Payment failed."
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold italic">Success!</h1>
          <p className="text-black/50">Your funds have been processed securely on-chain.</p>
          <button onClick={() => router.push("/home")} className="w-full py-4 rounded-2xl bg-primary font-bold shadow-lg active:scale-95 transition-all">Back Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32 overflow-x-hidden">
      <Header />

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 shadow-xl shadow-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-amber-900/60" />
            <p className="text-[10px] font-bold text-amber-900/60 tracking-widest uppercase">Saku Balance</p>
          </div>
          <p className="text-4xl font-bold text-black/85 tracking-tighter">{formattedBalance}</p>
        </div>

        <div className="flex p-1.5 bg-muted rounded-[2rem] border border-black/5 shadow-inner">
          {(["receive", "pay"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-3 rounded-[1.5rem] font-bold text-[10px] tracking-widest uppercase transition-all ${activeTab === tab ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black/60"}`}
            >
              {tab === "receive" ? "Receive" : "Scan & Pay"}
            </button>
          ))}
        </div>

        {activeTab === "receive" && (
           <div className="space-y-6 animate-in slide-in-from-left duration-300">
            {!qrData ? (
             <div className="space-y-5">
               <div className="space-y-2 px-2">
                 <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2 uppercase italic">Amount to Request</label>
                 <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-black/20 text-xl">Rp</span>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="0" 
                      className="w-full bg-muted/50 rounded-[2rem] pl-16 pr-8 py-6 text-3xl font-bold outline-none border-2 border-transparent focus:border-primary/50 transition-all" 
                    />
                 </div>
               </div>
               <button 
                onClick={() => {
                  if(!amount || Number(amount) <= 0) return toast.error("Isi nominalnya dulu bos")
                  generateQR(user?.phone_number!, amount).then(r => r.success && setQrData(r.qrHash))
                }} 
                disabled={qrLoading || !amount}
                className="w-full py-6 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
               >
                 {qrLoading ? <Loader2 className="animate-spin" /> : <QrCode size={20}/>} 
                 Generate Payment QR
               </button>
             </div>
           ) : (
             <div className="flex flex-col items-center p-8 bg-white rounded-[3rem] border border-primary/10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
               <div className="p-6 bg-white rounded-[2.5rem] shadow-inner border-[8px] border-primary/5">
                <QRCodeSVG value={qrData} size={200} level="H" />
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase mb-1 italic">Requesting Payment</p>
                 <p className="text-4xl font-bold text-black/85 tracking-tighter">IDR {Number(amount).toLocaleString()}</p>
               </div>

               {/* Payment Code Display & Copy */}
               <div className="w-full space-y-2">
                 <p className="text-[10px] font-bold text-black/40 tracking-widest uppercase ml-4 italic">Payment Code</p>
                 <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-3xl border border-black/5 group">
                   <code className="flex-1 font-mono text-[10px] font-bold text-black/60 break-all leading-tight px-2">
                     {qrData}
                   </code>
                   <button 
                    onClick={handleCopy}
                    className="p-3 bg-white rounded-2xl shadow-sm hover:bg-primary transition-all active:scale-90 border border-black/5"
                   >
                     {isCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-black/40" />}
                   </button>
                 </div>
               </div>

               <button onClick={() => { setQrData(null); setAmount(""); }} className="text-[10px] font-bold underline text-black/40 hover:text-black tracking-[0.2em] uppercase italic">Create New Request</button>
             </div>
           )}
         </div>
        )}

        {activeTab === "pay" && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="relative w-full aspect-square rounded-[3.5rem] bg-black overflow-hidden border-4 border-muted/20 shadow-2xl flex items-center justify-center">
               <div id="reader" className="w-full h-full"></div>
               
               {!isScannerActive && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-10 text-center space-y-4">
                   <Camera className="w-12 h-12 text-primary animate-pulse" />
                   <p className="font-bold italic">Camera Ready</p>
                   <button onClick={startScanner} className="px-8 py-3 bg-primary text-black rounded-xl font-bold text-[10px] tracking-widest active:scale-95 transition-all">START SCANNING</button>
                 </div>
               )}
            </div>

            <div className="space-y-4">
              <div className="px-2">
                <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2 uppercase italic">Manual Payment Hash</label>
                <input 
                  value={payInput} 
                  onChange={(e) => setPayInput(e.target.value)} 
                  placeholder="Paste payment code here..." 
                  className="w-full bg-muted/50 rounded-[2rem] px-8 py-5 font-mono text-[10px] outline-none border-2 border-transparent focus:border-primary/50 transition-all" 
                />
              </div>
              <button 
                onClick={handleClaimPayment} 
                disabled={qrLoading || !payInput}
                className="w-full py-6 rounded-[2.5rem] bg-black text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
              >
                {qrLoading ? <Loader2 className="animate-spin" /> : <Scan size={20}/>} 
                Verify & Pay Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
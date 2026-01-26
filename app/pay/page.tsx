"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Scan, CheckCircle, ArrowLeft, Loader2, Copy, Camera, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react" 
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { generateQR, claimPayment, loading } = useSakuQRPayment()
  const { formattedBalance, refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [activeTab, setActiveTab] = useState<"create" | "scan">("create")
  const [amount, setAmount] = useState("")
  const [qrData, setQrData] = useState<string | null>(null)
  const [payInput, setPayInput] = useState("")
  const [success, setSuccess] = useState(false)
  const [isScannerActive, setIsScannerActive] = useState(false)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    if (activeTab === "scan") {
      // Kasih delay dikit biar DOM "reader" beneran siap
      const timer = setTimeout(() => startScanner(), 500);
      return () => {
        clearTimeout(timer);
        stopScanner();
      }
    } else {
      stopScanner();
    }
  }, [activeTab]);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      setIsScannerActive(true);
      
      // QRBox dibikin proporsional biar gampang scan
      const config = { 
        fps: 15, // Naikin FPS biar lebih responsif
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            return { width: viewfinderWidth * 0.7, height: viewfinderWidth * 0.7 };
        },
        aspectRatio: 1.0 
      };
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
          // Kalo dapet kode, langsung masukin ke input
          setPayInput(decodedText);
          toast.success("QR Code detected! ✅");
          // Jangan langsung stop biar user bisa liat kodenya masuk dulu
          setTimeout(() => stopScanner(), 1000);
        },
        () => {} // Silent fail buat frame yang gak ada QR-nya
      );
    } catch (err) {
      console.error("Camera error:", err);
      setIsScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScannerActive(false);
      } catch (e) {
        console.error("Stop failed", e);
      }
    }
  };

  const handleCreatePayment = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Please enter a valid amount")
    if (!user?.phone_number) return toast.error("Session expired.")
    const result = await generateQR(user.phone_number, amount)
    if (result.success) {
      setQrData(result.qrHash)
      toast.success("Payment Request Created!")
    }
  }

  const handleClaimPayment = async () => {
    if (!payInput) return toast.error("Please provide a payment code")
    
    toast.promise(claimPayment(payInput), {
      loading: 'Securing transaction on-chain...',
      success: (result) => {
        if (result && result.success) {
          setSuccess(true)
          refetchBalance()
          return "Payment successful! 💸"
        }
        throw new Error("Transaction failed")
      },
      error: (err) => err.message || "Payment failed."
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-card rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          <h1 className="text-3xl font-black">Transfer Success!</h1>
          <p className="text-muted-foreground font-medium">Your IDRX has been sent securely.</p>
          <button onClick={() => router.push("/home")} className="w-full py-4 rounded-2xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all">Back Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
      <div className="p-6 flex items-center gap-4 border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black tracking-tight">QR Payment</h1>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center shadow-sm">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Total Balance</p>
          <p className="text-3xl font-black">{formattedBalance}</p>
        </div>

        <div className="flex p-1.5 bg-muted rounded-3xl">
          <button 
            onClick={() => setActiveTab("create")} 
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === "create" ? "bg-white shadow-sm text-black" : "text-muted-foreground"}`}
          >
            Receive
          </button>
          <button 
            onClick={() => setActiveTab("scan")} 
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === "scan" ? "bg-white shadow-sm text-black" : "text-muted-foreground"}`}
          >
            Pay
          </button>
        </div>

        {activeTab === "create" ? (
          <div className="space-y-6 animate-in slide-in-from-left duration-500">
            {!qrData ? (
              <div className="space-y-5">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Amount to Request</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full bg-muted/50 border-2 border-transparent focus:border-black/5 rounded-[2rem] px-8 py-5 text-2xl font-black outline-none transition-all" 
                    />
                </div>
                <button onClick={handleCreatePayment} disabled={!amount || loading} className="w-full py-5 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all shadow-black/20">
                  <QrCode className="w-5 h-5" /> Generate QR Code
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center p-8 bg-card rounded-[2.5rem] border border-border shadow-2xl space-y-6 animate-in zoom-in duration-300">
                <div className="p-6 bg-white rounded-[2rem] shadow-inner border-[12px] border-muted/20">
                    <QRCodeSVG value={qrData} size={220} level="H" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-muted-foreground">Request Amount</p>
                    <p className="text-3xl font-black text-black">Rp {Number(amount).toLocaleString()}</p>
                </div>
                <button onClick={() => setQrData(null)} className="text-[10px] font-black text-muted-foreground hover:text-black uppercase tracking-widest transition-colors underline underline-offset-4">Create New</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="relative w-full aspect-square overflow-hidden rounded-[3rem] bg-black border-4 border-muted/10 shadow-2xl flex items-center justify-center">
              <div id="reader" className="w-full h-full object-cover"></div>
              
              {!isScannerActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-8 text-center space-y-5">
                  <Camera className="w-14 h-14 opacity-40 animate-pulse" />
                  <div>
                    <p className="text-lg font-black">Camera Inactive</p>
                    <p className="text-xs text-muted-foreground px-4">Ensure camera permissions are allowed in your browser.</p>
                  </div>
                  <button onClick={startScanner} className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] shadow-lg active:scale-95 transition-all">ENABLE CAMERA</button>
                </div>
              )}

              {isScannerActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                   {/* Scanning Overlay Area */}
                   <div className="w-64 h-64 border-2 border-white/50 rounded-[2rem] relative shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
                   </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-2">Payment Code (Manual)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={payInput} 
                    onChange={(e) => setPayInput(e.target.value)} 
                    placeholder="saku:pay:..." 
                    className="w-full bg-muted/50 border-2 border-transparent focus:border-black/5 rounded-[2rem] px-8 py-5 font-mono text-xs font-bold outline-none transition-all" 
                  />
                  {payInput && (
                    <button onClick={() => setPayInput("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-full">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={handleClaimPayment} 
                disabled={loading || !payInput} 
                className="w-full py-5 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />} 
                Confirm Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
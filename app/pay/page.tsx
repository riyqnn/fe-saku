"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  QrCode, Scan, Loader2, Camera, X, Wallet, 
  Sparkles, Copy, Check, Image as ImageIcon, Download
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { QRCodeSVG } from "qrcode.react" 
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"
import { toPng } from "html-to-image"
import Header from "@/components/layout/Header"
import SuccessStep from "@/components/transfer/steps/success-step"

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { generateQR, claimPayment, loading: qrLoading } = useSakuQRPayment()

  const [activeTab, setActiveTab] = useState<"scan" | "receive">("scan")
  const [amount, setAmount] = useState("")
  const [qrData, setQrData] = useState<string | null>(null)
  const [payInput, setPayInput] = useState("")
  const [successData, setSuccessData] = useState<{amount: string, txHash: string} | null>(null)
  const [isScannerActive, setIsScannerActive] = useState(false)
  
  // Refs for scanner management
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isTransitioning = useRef(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- SCANNER LOGIC WITH SAFETY CHECKS ---
  const startScanner = async () => {
    if (isTransitioning.current || scannerRef.current?.isScanning) return
    
    isTransitioning.current = true
    try {
      // Pastikan element "reader" ada sebelum init
      const element = document.getElementById("reader")
      if (!element) return

      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 20, qrbox: { width: 250, height: 250 } },
        (text) => { 
          setPayInput(text)
          toast.success("QR captured!")
          safeStopScanner() 
        },
        () => {} // Silent on failure to scan frame
      )
      setIsScannerActive(true)
    } catch (err) { 
      console.error("Scanner start error:", err)
      setIsScannerActive(false)
    } finally {
      isTransitioning.current = false
    }
  }

  const safeStopScanner = async () => {
    // 1. Cek apakah ada instance scanner dan sedang aktif
    if (!scannerRef.current || isTransitioning.current) return;
    
    // 2. Gunakan status internal library untuk memastikan kondisi
    if (scannerRef.current.isScanning) {
      isTransitioning.current = true;
      try {
        // 3. Hentikan scanner secara asinkron
        await scannerRef.current.stop();
        
        // 4. Bersihkan elemen DOM secara paksa agar React tidak bingung
        const readerEl = document.getElementById("reader");
        if (readerEl) {
          readerEl.innerHTML = ""; 
        }
        
        scannerRef.current = null;
        setIsScannerActive(false);
      } catch (err) {
        // 5. Tangkap error NotFoundError tanpa memunculkan error console yang mengganggu
        console.warn("Scanner stopped with minor DOM cleanup warning:", err);
      } finally {
        isTransitioning.current = false;
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Gunakan instance baru untuk file scan agar tidak tabrakan dengan video stream
    const fileScanner = new Html5Qrcode("reader")
    try {
      const result = await fileScanner.scanFile(file, true)
      setPayInput(result)
      toast.success("QR detected from image!")
    } catch (err) {
      toast.error("No valid QR code found in image")
    }
  }

  useEffect(() => {
    if (activeTab === "scan") {
      // Kasih delay dikit biar DOM "reader" siap di-render React
      const timer = setTimeout(() => startScanner(), 500)
      return () => {
        clearTimeout(timer)
        safeStopScanner()
      }
    } else {
      safeStopScanner()
    }
  }, [activeTab])

  const handleClaim = async () => {
    if (!payInput) return toast.error("scan or enter code first")
    
    try {
        // Gunakan toast.promise agar user tahu proses blockchain sedang jalan
        const result = await claimPayment(payInput)
        
        if (result.success) {
            // PASTIKAN PROPERTI INI MATCH SAMA RESPONSE API LO
            setSuccessData({ 
                amount: result.amount, // API balikin result.amount
                txHash: result.transactionHash // API balikin result.transactionHash
            })
            toast.success("payment successful!")
        }
    } catch (err: any) {
        toast.error(err.message || "payment failed")
    }
  }

  const downloadQR = async () => {
    if (!qrRef.current) return
    try {
      const dataUrl = await toPng(qrRef.current, { backgroundColor: '#fff', pixelRatio: 3 })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `SAKU-QR-${amount}.png`
      // Simulasi click di window agar CSP blob tidak memblokir link internal
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      toast.error("Failed to download. Screenshot the QR instead.")
    }
  }

  if (successData) {
    return (
      <SuccessStep 
        txHash={successData.txHash}
        receiverName="Saku Merchant"
        receiverPhone="QR Payment"
        amount={successData.amount}
        billDescription="QR Payment Settlement"
        onComplete={() => router.push("/home")}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32 overflow-x-hidden">
      <Header />

      <div className="p-6 space-y-6 flex-1">
        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-muted rounded-2xl border border-border shadow-inner">
          <button 
            onClick={() => setActiveTab("scan")} 
            className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${activeTab === "scan" ? "bg-white shadow-sm text-slate-900" : "text-muted-foreground"}`}
          >
            <Scan size={14} /> scan qr
          </button>
          <button 
            onClick={() => setActiveTab("receive")} 
            className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${activeTab === "receive" ? "bg-white shadow-sm text-slate-900" : "text-muted-foreground"}`}
          >
            <QrCode size={14} /> receive usdc
          </button>
        </div>

        {/* --- SCAN TAB --- */}
        {activeTab === "scan" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative w-full aspect-square rounded-[3rem] bg-slate-900 overflow-hidden border-4 border-white shadow-2xl">
               <div id="reader" className="w-full h-full"></div>
               
               {/* Finder Overlay UI */}
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-primary/50 rounded-[2.5rem] relative shadow-[0_0_0_999px_rgba(0,0,0,0.4)]">
                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-3xl" />
                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-3xl" />
                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-3xl" />
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-3xl" />
                  </div>
               </div>

               {!isScannerActive && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-10 text-center space-y-4">
                   <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                   </div>
                   <button onClick={startScanner} className="px-8 py-3 bg-primary text-slate-900 rounded-xl font-bold text-[10px] tracking-widest uppercase active:scale-95 transition-all">Start Camera</button>
                 </div>
               )}
            </div>

            <div className="flex justify-center">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-border rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
                >
                    <ImageIcon size={14} /> upload from gallery
                </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-dashed border-border">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-2">Manual Entry</label>
                <input 
                  value={payInput} 
                  onChange={(e) => setPayInput(e.target.value)} 
                  placeholder="Paste payment code here..." 
                  className="w-full bg-slate-100/50 border border-transparent rounded-2xl px-6 py-5 font-mono text-[10px] outline-none focus:bg-white focus:border-primary/20 transition-all" 
                />
              </div>
              <button 
                onClick={handleClaim} 
                disabled={qrLoading || !payInput}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 transition-all"
              >
                {qrLoading ? <Loader2 className="animate-spin" size={18} /> : <Scan size={18}/>} 
                verify & pay now
              </button>
            </div>
          </div>
        )}

        {/* --- RECEIVE TAB --- */}
        {activeTab === "receive" && (
           <div className="space-y-6 animate-in fade-in duration-500">
            {!qrData ? (
             <div className="space-y-5">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-2">amount to request</label>
                 <div className="relative group">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-2xl group-focus-within:text-primary transition-colors">$</span>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full bg-slate-100/50 border border-transparent rounded-[2.5rem] pl-16 pr-8 py-8 text-4xl font-black outline-none focus:bg-white focus:border-primary/30 transition-all placeholder:text-slate-200 text-slate-900" 
                    />
                 </div>
               </div>
               <button 
                onClick={() => {
                  if(!amount || Number(amount) <= 0) return toast.error("Invalid amount")
                  generateQR(user?.phone_number!, amount).then(r => r.success && setQrData(r.qrHash))
                }} 
                disabled={qrLoading || !amount}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 transition-all"
               >
                 {qrLoading ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18}/>} 
                 generate usdc qr
               </button>
             </div>
           ) : (
             <div className="flex flex-col items-center animate-in zoom-in duration-300">
               <div ref={qrRef} className="p-8 bg-white rounded-[3.5rem] border border-border shadow-lg flex flex-col items-center space-y-6">
                 <div className="p-5 bg-slate-50 rounded-3xl border-4 border-slate-100">
                    <QRCodeSVG value={qrData} size={220} level="H" includeMargin />
                 </div>
                 <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">payment request</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{parseFloat(amount).toFixed(2)} <span className="text-slate-400 font-bold text-xl uppercase">usdc</span></p>
                 </div>
               </div>

               <div className="w-full mt-8 space-y-3">
                 <button 
                    onClick={downloadQR}
                    className="w-full py-4 rounded-2xl bg-secondary text-white border border-slate-200 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.95] transition-all shadow-sm"
                 >
                    <Download size={16} /> Save QR to Gallery
                 </button>
                 
                 <div className="flex items-center gap-2 bg-slate-100 p-4 rounded-2xl border border-border overflow-hidden">
                   <code className="flex-1 font-mono text-[10px] text-slate-500 truncate px-2 uppercase">{qrData}</code>
                   <button onClick={() => { navigator.clipboard.writeText(qrData || ""); toast.success("Code copied!"); }} className="p-2.5 bg-white rounded-xl shadow-sm active:scale-90 transition-all border border-slate-200">
                     <Copy size={14} className="text-slate-400" />
                   </button>
                 </div>
               </div>

               <button onClick={() => { setQrData(null); setAmount(""); }} className="mt-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors underline decoration-dashed underline-offset-4">Create New Request</button>
             </div>
           )}
         </div>
        )}
      </div>
    </div>
  )
}
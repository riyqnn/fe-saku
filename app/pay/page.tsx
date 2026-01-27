"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  QrCode, Scan, CheckCircle, ArrowLeft, Loader2, 
  Camera, X, Plus, Trash2, Search, UserPlus, Send, Check, Receipt, Wallet, Sparkles, ChevronRight
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { useBalance } from "@/hooks/useBalance"
import { useSakuTransfer } from "@/hooks/useSakuTransfer"
import { QRCodeSVG } from "qrcode.react" 
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"
import Header from "@/components/layout/Header"

interface Member { phone_number: string; full_name: string; }
interface BillItem { id: string; name: string; price: number; }

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { generateQR, claimPayment, loading: qrLoading } = useSakuQRPayment()
  const { formattedBalance, refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [activeTab, setActiveTab] = useState<"receive" | "pay" | "split">("receive")

  const [amount, setAmount] = useState("")
  const [qrData, setQrData] = useState<string | null>(null)
  const [payInput, setPayInput] = useState("")
  const [success, setSuccess] = useState(false)
  const [isScannerActive, setIsScannerActive] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [description, setDescription] = useState("")
  const [tax, setTax] = useState("0")
  const [discount, setDiscount] = useState("0")
  const [items, setItems] = useState<BillItem[]>([{ id: Math.random().toString(36).substring(2, 9), name: "", price: 0 }])
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMemberPhone, setSelectedMemberPhone] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isTransitioning = useRef(false);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode
      setIsScannerActive(true)

      const config = { 
        fps: 20, 
        qrbox: (viewfinderWidth: number) => {
          const size = Math.max(200, Math.floor(viewfinderWidth * 0.7));
          return { width: size, height: size };
        },
        aspectRatio: 1.0 
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (text) => { 
          setPayInput(text); 
          toast.success("QR Code detected! ✅"); 
          stopScanner();
        },
        () => {}
      )
    } catch (err) { 
      setIsScannerActive(false) 
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning && !isTransitioning.current) {
      try {
        isTransitioning.current = true;
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScannerActive(false);
      } catch (e) {
        console.error("Stop failed", e);
      } finally {
        isTransitioning.current = false;
      }
    }
  };

  useEffect(() => {
    const handleTabChange = async () => {
      if (activeTab === "pay") {
        if (!isTransitioning.current) {
          setTimeout(() => startScanner(), 500);
        }
      } else {
        await stopScanner();
      }
      
      if (activeTab === "split" && user && members.length === 0) {
        setMembers([{ phone_number: user.phone_number, full_name: "Me (You)" }]);
        setSelectedMemberPhone(user.phone_number);
      }
    };

    handleTabChange();
    
    return () => {
      stopScanner();
    };
  }, [activeTab, user]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        try {
          const res = await fetch(`/api/profile/search?query=${searchQuery}`) 
          const data = await res.json()
          if (data.success) {
            setSearchResults(data.profiles.filter((p: Member) => !members.find(m => m.phone_number === p.phone_number)))
          }
        } catch (err) { console.error(err) }
      } else { setSearchResults([]) }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, members])

  const handleSplitSubmit = async () => {
    if (!description) return toast.error("Please add a description")
    const allAssigned = items.every(item => members.some(m => assignments[m.phone_number]?.includes(item.id)))
    if (!allAssigned) return toast.error("Some items are unclaimed")

    setIsSubmitting(true)
    toast.promise(
      fetch('/api/split-bill/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorPhone: user?.phone_number,
          description,
          totalTax: Number(tax),
          totalDiscount: Number(discount),
          items: items.map(item => ({
            name: item.name, price: item.price,
            assignedTo: members.filter(m => assignments[m.phone_number]?.includes(item.id)).map(m => m.phone_number)
          }))
        })
      }).then(res => res.ok ? res.json() : Promise.reject()),
      {
        loading: 'Creating split bill party...',
        success: () => { router.push('/home'); return 'Split bill dispatched! 🚀' },
        error: () => { setIsSubmitting(false); return 'Failed to create bill' }
      }
    )
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans overflow-hidden">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in duration-500 border border-primary/20">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold italic text-black/85">Success!</h1>
          <p className="text-black/50 font-medium">Your funds have been processed securely on-chain.</p>
          <button onClick={() => router.push("/home")} className="w-full py-4 rounded-2xl bg-primary text-black font-semibold shadow-lg shadow-primary/30 active:scale-95 transition-all">Back Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32 overflow-x-hidden">
      <Header />

      <div className="p-6 space-y-6 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 overflow-hidden shadow-xl shadow-primary/20 group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Wallet size={80} className="text-amber-900" />
          </div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-900/60" />
              <p className="text-[10px] font-bold text-amber-900/60 tracking-[0.2em]">Saku Wallet Balance</p>
            </div>
            <p className="text-4xl font-bold text-black/85 tracking-tighter">{formattedBalance}</p>
            <div className="pt-4 flex items-center gap-2 text-xs font-semibold text-amber-900/60">
              <span className="px-2 py-1 bg-black/5 rounded-lg">IDRX Protocol</span>
              <span>Active</span>
            </div>
          </div>
        </div>

        <div className="flex p-1.5 bg-muted rounded-[2rem] sticky top-20 z-20 border border-black/5 shadow-inner">
          {(["receive", "pay", "split"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-3 rounded-[1.5rem] font-semibold text-[10px] tracking-widest capitalize transition-all ${activeTab === tab ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black/70"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "receive" && (
          <div className="space-y-6 animate-in slide-in-from-left duration-500">
             {!qrData ? (
              <div className="space-y-5">
                <div className="space-y-2 px-2">
                  <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2">Amount to Request</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-black/20 text-xl">Rp</span>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="0" 
                      className="w-full bg-muted/50 border-2 border-transparent focus:border-primary/50 focus:bg-white rounded-[2rem] pl-16 pr-8 py-6 text-3xl font-bold outline-none transition-all placeholder:text-black/5" 
                    />
                  </div>
                </div>
                <button 
                  onClick={() => { if(!amount || Number(amount) <= 0) return; generateQR(user?.phone_number!, amount).then(r => r.success && setQrData(r.qrHash)) }} 
                  disabled={!amount || qrLoading} 
                  className="w-full py-6 rounded-[2rem] bg-black text-white font-semibold text-lg shadow-xl shadow-black/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
                >
                  {qrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />} 
                  Generate Payment QR
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center p-10 bg-white rounded-[3rem] border border-primary/10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
                <div className="p-8 bg-white rounded-[2.5rem] shadow-inner border-[12px] border-primary/5 relative">
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <QRCodeSVG value={qrData} size={220} level="H" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-black/40 tracking-widest italic">Requesting Payment</p>
                    <p className="text-4xl font-bold text-black/85 tracking-tighter">IDR {Number(amount).toLocaleString()}</p>
                </div>
                <button onClick={() => setQrData(null)} className="text-[10px] font-bold text-black/40 hover:text-black tracking-widest transition-colors underline underline-offset-8">Create New Request</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "pay" && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="relative w-full aspect-square overflow-hidden rounded-[3.5rem] bg-black border-4 border-muted/20 shadow-2xl flex items-center justify-center group">
              <div id="reader" className="w-full h-full object-cover"></div>
              
              {!isScannerActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                    <Camera className="w-10 h-10 opacity-30 animate-pulse text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold italic">Camera Ready</p>
                    <p className="text-xs text-white/40 px-6">Scan any Saku QR Code to process your payment instantly.</p>
                  </div>
                  <button onClick={startScanner} className="px-10 py-4 bg-primary text-black rounded-2xl font-bold text-[10px] shadow-lg shadow-primary/20 active:scale-95 transition-all">START SCANNING</button>
                </div>
              )}

              {isScannerActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                   <div className="w-64 h-64 border-2 border-white/20 rounded-[2.5rem] relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/30 animate-pulse shadow-[0_0_15px_rgba(255,211,98,0.5)]"></div>
                   </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-3 px-2">
                <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2">Manual Payment Hash</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={payInput} 
                    onChange={(e) => setPayInput(e.target.value)} 
                    placeholder="saku:pay:0x..." 
                    className="w-full bg-muted/50 border-2 border-transparent focus:border-primary/50 focus:bg-white rounded-[2rem] px-8 py-5 font-mono text-[10px] font-semibold outline-none transition-all" 
                  />
                  {payInput && (
                    <button onClick={() => setPayInput("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-full">
                        <X className="w-4 h-4 text-black/30" />
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={handleClaimPayment} 
                disabled={qrLoading || !payInput} 
                className="w-full py-6 rounded-[2.5rem] bg-black text-white font-semibold text-lg shadow-xl shadow-black/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
              >
                {qrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />} 
                Verify & Pay
              </button>
            </div>
          </div>
        )}

        {activeTab === "split" && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500 overflow-x-hidden">
            <section className="p-8 rounded-[3rem] bg-primary/5 border border-primary/20 space-y-6 shadow-inner relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
              <input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Where's the dinner?" 
                className="w-full bg-transparent text-3xl font-bold outline-none italic placeholder:text-black/5 relative z-10" 
              />
              <div className="flex gap-6 border-t border-black/5 pt-6 text-[10px] font-bold tracking-widest text-black/40 relative z-10">
                <div className="flex-1 space-y-1">
                    <p>Tax Amount</p>
                    <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 text-black outline-none font-bold" />
                </div>
                <div className="flex-1 space-y-1">
                    <p>Discount (%)</p>
                    <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 text-black outline-none font-bold" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-[10px] font-bold text-black/40 tracking-[0.2em]">1. The Menu List</h3>
                <button onClick={() => setItems([...items, { id: Math.random().toString(36).substring(2, 9), name: "", price: 0 }])} className="p-2.5 bg-primary text-black rounded-xl shadow-lg shadow-primary/20 active:scale-90 transition-transform"><Plus size={16} strokeWidth={3}/></button>
              </div>
              <div className="space-y-3 px-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center group">
                    <input placeholder="Menu name" value={item.name} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} className="flex-1 bg-muted/50 rounded-[1.5rem] px-4 py-4 font-semibold text-xs outline-none focus:bg-white focus:border-primary/30 border-2 border-transparent transition-all capitalize" />
                    <input type="number" placeholder="Price" value={item.price || ""} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} className="w-24 bg-muted/50 rounded-[1.5rem] px-4 py-4 font-semibold text-xs outline-none focus:bg-white focus:border-primary/30 border-2 border-transparent transition-all" />
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="opacity-30 hover:!opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-[10px] font-bold text-black/40 tracking-[0.2em] px-4">2. Assign the Squad</h3>
              <div className="relative px-2">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Saku friends..." className="w-full bg-muted/50 rounded-[2rem] pl-14 pr-8 py-5 font-semibold text-sm outline-none focus:bg-white focus:border-primary/30 border-2 border-transparent transition-all" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-2 right-2 mt-3 bg-white border border-primary/10 rounded-[2.5rem] shadow-2xl z-30 p-3 animate-in fade-in duration-200">
                    {searchResults.map(p => (
                      <button key={p.phone_number} onClick={() => { setMembers([...members, p]); setSearchQuery(""); setSearchResults([]); setSelectedMemberPhone(p.phone_number); }} className="w-full text-left p-4 hover:bg-primary/10 rounded-[1.8rem] flex items-center justify-between transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-amber-700">{p.full_name.charAt(0)}</div>
                            <span className="font-semibold text-sm capitalize">{p.full_name}</span>
                        </div>
                        <UserPlus size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 px-4">
                {members.map(m => (
                  <button key={m.phone_number} onClick={() => setSelectedMemberPhone(m.phone_number)} className={`px-4 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${selectedMemberPhone === m.phone_number ? "bg-black text-white scale-105 shadow-md" : "bg-muted text-black/40 hover:bg-black/5"}`}>
                    <span className="capitalize">{m.full_name}</span> <span className="opacity-50">({assignments[m.phone_number]?.length || 0})</span>
                  </button>
                ))}
              </div>
            </section>

            {selectedMemberPhone && (
              <section className="space-y-4 animate-in fade-in duration-500 pb-10">
                <div className="flex items-center gap-2 justify-center py-2 px-6 bg-primary/20 rounded-full w-fit mx-auto">
                    <p className="text-[10px] font-bold text-amber-900 tracking-widest italic">Assigning to {members.find(m => m.phone_number === selectedMemberPhone)?.full_name}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 px-2">
                  {items.filter(i => i.name).map(item => {
                    const isSelected = assignments[selectedMemberPhone]?.includes(item.id)
                    return (
                      <button 
                        key={item.id} 
                        onClick={() => {
                          setAssignments(prev => {
                            const cur = prev[selectedMemberPhone] || []
                            return { ...prev, [selectedMemberPhone]: cur.includes(item.id) ? cur.filter(id => id !== item.id) : [...cur, item.id] }
                          })
                        }}
                        className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all ${isSelected ? "bg-white border-primary shadow-xl scale-[1.01]" : "bg-white border-black/5 grayscale opacity-60"}`}
                      >
                        <div className="text-left">
                            <p className="font-bold text-sm italic text-black/85 capitalize">{item.name}</p>
                            <p className="text-[10px] font-semibold text-black/30">IDR {item.price.toLocaleString()}</p>
                        </div>
                        {isSelected ? (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/30">
                                <Check size={18} strokeWidth={4}/>
                            </div>
                        ) : (
                            <Plus size={20} className="text-black/10" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-6 transition-all duration-500 z-30 ${
        activeTab === "split" ? "bg-white/80 backdrop-blur-xl border-t border-border translate-y-0" : "bg-transparent pointer-events-none translate-y-10 opacity-0"
      }`}>
        {activeTab === "split" && (
          <button 
            onClick={handleSplitSubmit} 
            disabled={isSubmitting} 
            className="w-full py-6 rounded-[3rem] bg-primary text-black font-bold text-xs shadow-xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30 transition-all tracking-widest italic uppercase"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} 
            Create Split Session
          </button>
        )}
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  QrCode, Scan, CheckCircle, Loader2, 
  Camera, X, Plus, Trash2, Search, UserPlus, Send, Check, Receipt, Wallet, Sparkles, Minus
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react" 
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"
import Header from "@/components/layout/Header"

interface Member { phone_number: string; full_name: string; }
// Qty wajib ada di sini bos
interface BillItem { id: string; name: string; price: number; qty: number; }

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { generateQR, claimPayment, loading: qrLoading } = useSakuQRPayment()
  const { formattedBalance, refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [activeTab, setActiveTab] = useState<"receive" | "pay" | "split">("receive")

  // Payment States
  const [amount, setAmount] = useState("")
  const [qrData, setQrData] = useState<string | null>(null)
  const [payInput, setPayInput] = useState("")
  const [success, setSuccess] = useState(false)
  const [isScannerActive, setIsScannerActive] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // Split Bill States - Inisialisasi awal pake qty: 1 biar gak error TS
  const [description, setDescription] = useState("")
  const [tax, setTax] = useState("0")
  const [discount, setDiscount] = useState("0")
  const [items, setItems] = useState<BillItem[]>([{ id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [selectedMemberPhone, setSelectedMemberPhone] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  
  // OCR States
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isTransitioning = useRef(false)

  // --- SCANNER LOGIC ---
  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode
      setIsScannerActive(true)
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 20, qrbox: { width: 250, height: 250 } },
        (text) => { setPayInput(text); toast.success("QR Detected!"); stopScanner(); },
        () => {}
      )
    } catch (err) { setIsScannerActive(false) }
  }

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning && !isTransitioning.current) {
      isTransitioning.current = true
      await scannerRef.current.stop()
      scannerRef.current = null
      setIsScannerActive(false)
      isTransitioning.current = false
    }
  }

  // --- OCR LOGIC (GEMINI) ---
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data }),
        });
        const data = await res.json();
        
        if (data.success) {
          const processedItems = data.items.map((item: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            name: item.name,
            price: item.price,
            qty: item.qty || 1 // Pastikan qty selalu ada
          }));

          setItems(processedItems);
          setTax(data.totalTax?.toString() || "0");
          setDiscount(data.totalDiscount?.toString() || "0");
          toast.success("Struk terbaca dengan quantity! ⚡️");
        }
      } catch (err) {
        toast.error("Gagal baca struk.");
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (activeTab === "pay") setTimeout(() => startScanner(), 500)
    else stopScanner()
    if (activeTab === "split" && user && members.length === 0) {
      setMembers([{ phone_number: user.phone_number, full_name: "Me (You)" }])
      setSelectedMemberPhone(user.phone_number)
    }
    return () => { stopScanner() }
  }, [activeTab, user])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        const res = await fetch(`/api/profile/search?query=${searchQuery}`) 
        const data = await res.json()
        if (data.success) {
          setSearchResults(data.profiles.filter((p: Member) => !members.find(m => m.phone_number === p.phone_number)))
        }
      } else { setSearchResults([]) }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, members])

  const handleSplitSubmit = async () => {
    if (!description) return toast.error("Please add a description")
    setIsSubmitting(true)
    
    // Logic hitung Grand Total buat preview toast doang
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const grandTotal = subtotal + Number(tax) - Number(discount);

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
              ...item,
              assignedTo: members.filter(m => assignments[m.phone_number]?.includes(item.id)).map(m => m.phone_number)
            }))
          })
        }).then(res => res.ok ? res.json() : Promise.reject()),
        {
          loading: 'Creating split session...',
          success: () => { router.push('/home'); return `Bill IDR ${grandTotal.toLocaleString()} dispatched! 🚀` },
          error: () => { setIsSubmitting(false); return 'Failed to create bill' }
        }
      )
  }

  const handleClaimPayment = async () => {
    toast.promise(claimPayment(payInput), {
      loading: 'Processing...',
      success: () => { setSuccess(true); refetchBalance(); return "Paid! 💸" },
      error: "Payment failed."
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-6">
          <CheckCircle className="w-20 h-20 text-primary mx-auto" />
          <h1 className="text-3xl font-bold italic">Success!</h1>
          <button onClick={() => router.push("/home")} className="w-full py-4 rounded-2xl bg-primary font-bold">Back Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32 overflow-x-hidden">
      <Header />

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Balance Card Section */}
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 shadow-xl">
          <p className="text-[10px] font-bold text-amber-900/60 tracking-widest uppercase">Saku Balance</p>
          <p className="text-4xl font-bold text-black/85">{formattedBalance}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1.5 bg-muted rounded-[2rem] border border-black/5">
          {(["receive", "pay", "split"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-3 rounded-[1.5rem] font-bold text-[10px] tracking-widest uppercase transition-all ${activeTab === tab ? "bg-white shadow-sm text-black" : "text-muted-foreground"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "receive" && (
           <div className="space-y-6 animate-in slide-in-from-left">
            {!qrData ? (
             <div className="space-y-5">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-black/40 ml-2">AMOUNT TO REQUEST</label>
                 <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-muted/50 rounded-[2rem] px-8 py-6 text-3xl font-bold outline-none" />
               </div>
               <button onClick={() => generateQR(user?.phone_number!, amount).then(r => r.success && setQrData(r.qrHash))} className="w-full py-6 rounded-[2rem] bg-black text-white font-bold flex items-center justify-center gap-3">
                 <QrCode size={20}/> Generate QR
               </button>
             </div>
           ) : (
             <div className="flex flex-col items-center p-10 bg-white rounded-[3rem] shadow-2xl space-y-6">
               <QRCodeSVG value={qrData} size={200} />
               <p className="text-4xl font-bold">IDR {Number(amount).toLocaleString()}</p>
               <button onClick={() => setQrData(null)} className="text-[10px] font-bold underline">Create New</button>
             </div>
           )}
         </div>
        )}

        {activeTab === "pay" && (
          <div className="space-y-6 animate-in slide-in-from-bottom">
            <div id="reader" className="w-full aspect-square rounded-[3.5rem] bg-black overflow-hidden border-4 border-muted/20 relative">
               {!isScannerActive && (
                 <button onClick={startScanner} className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white">
                   <Camera className="w-12 h-12 text-primary animate-pulse mb-4" />
                   <span className="font-bold uppercase tracking-widest">Start Scanning</span>
                 </button>
               )}
            </div>
            <input value={payInput} onChange={(e) => setPayInput(e.target.value)} placeholder="Manual Payment Hash..." className="w-full bg-muted/50 rounded-[2rem] px-8 py-4 font-mono text-[10px]" />
            <button onClick={handleClaimPayment} className="w-full py-6 rounded-[2.5rem] bg-black text-white font-bold flex items-center justify-center gap-3">
              <Scan size={20}/> Verify & Pay
            </button>
          </div>
        )}

        {activeTab === "split" && (
          <div className="space-y-8 animate-in slide-in-from-right">
            {/* Header Split Bill */}
            <section className="p-8 rounded-[3rem] bg-primary/5 border border-primary/20 space-y-4">
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the occasion?" className="w-full bg-transparent text-2xl font-bold italic outline-none" />
              <div className="flex gap-4">
                 <div className="flex-1">
                    <p className="text-[8px] font-bold text-black/40">TAX (IDR)</p>
                    <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 font-bold" />
                 </div>
                 <div className="flex-1">
                    <p className="text-[8px] font-bold text-black/40">DISCOUNT (IDR)</p>
                    <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 font-bold" />
                 </div>
              </div>
            </section>

            {/* Menu List with OCR Button */}
            <section className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-[10px] font-bold text-black/40 tracking-widest uppercase">1. Menu List</h3>
                <div className="flex gap-2">
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-black text-primary rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                    {isOcrLoading ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                    <span className="text-[10px] font-bold">SCAN STRUK</span>
                  </button>
                  <button onClick={() => setItems([...items, { id: Math.random().toString(36).substring(2, 9), name: "", price: 0, qty: 1 }])} className="p-2.5 bg-primary text-black rounded-xl">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-3 px-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center group">
                    <input placeholder="Menu..." value={item.name} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} className="flex-1 bg-muted/50 rounded-[1.5rem] px-4 py-4 font-semibold text-xs outline-none focus:bg-white border-2 border-transparent" />
                    
                    {/* Quantity Selector UI */}
                    <div className="flex items-center bg-muted/50 rounded-[1.5rem] px-2 h-full border-2 border-transparent">
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="p-1 hover:bg-black/5 rounded-full"><Minus size={12}/></button>
                        <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                        <button onClick={() => setItems(items.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="p-1 hover:bg-black/5 rounded-full"><Plus size={12}/></button>
                    </div>

                    <input type="number" placeholder="Price" value={item.price || ""} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} className="w-24 bg-muted/50 rounded-[1.5rem] px-4 py-4 font-semibold text-xs outline-none focus:bg-white border-2 border-transparent" />
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="opacity-20 hover:opacity-100"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </section>

            {/* Squad Assignment */}
            <section className="space-y-5">
              <h3 className="text-[10px] font-bold text-black/40 tracking-widest uppercase px-4">2. The Squad</h3>
              <div className="relative px-2">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find friends..." className="w-full bg-muted/50 rounded-[2rem] pl-14 pr-8 py-5 font-semibold text-sm outline-none" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-2 right-2 mt-3 bg-white border rounded-[2.5rem] shadow-2xl z-30 p-3">
                    {searchResults.map(p => (
                      <button key={p.phone_number} onClick={() => { setMembers([...members, p]); setSearchQuery(""); setSearchResults([]); setSelectedMemberPhone(p.phone_number); }} className="w-full text-left p-4 hover:bg-primary/10 rounded-[1.8rem] flex justify-between items-center transition-all">
                        <span className="font-semibold text-sm">{p.full_name}</span>
                        <UserPlus size={16} className="text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 px-4">
                {members.map(m => (
                  <button key={m.phone_number} onClick={() => setSelectedMemberPhone(m.phone_number)} className={`px-4 py-2.5 rounded-full font-bold text-[10px] uppercase transition-all ${selectedMemberPhone === m.phone_number ? "bg-black text-white" : "bg-muted text-black/40"}`}>
                    {m.full_name} ({assignments[m.phone_number]?.length || 0})
                  </button>
                ))}
              </div>
            </section>

            {/* Assignment Grid */}
            {selectedMemberPhone && (
              <section className="space-y-4 animate-in fade-in duration-500 pb-10">
                <p className="text-[10px] font-bold text-center italic text-amber-900 bg-primary/20 py-2 rounded-full w-fit mx-auto px-6 uppercase">Assigning Items</p>
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
                        className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all ${isSelected ? "bg-white border-primary shadow-xl" : "bg-white border-black/5 grayscale opacity-60"}`}
                      >
                        <div className="text-left">
                            <p className="font-bold text-sm italic">{item.qty}x {item.name}</p>
                            <p className="text-[10px] font-bold text-black/30">IDR {(item.price * item.qty).toLocaleString()}</p>
                        </div>
                        {isSelected ? <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg"><Check size={18} strokeWidth={4}/></div> : <Plus size={20} className="text-black/10" />}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Floating Submit Button (For Split) */}
      <div className={`fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-6 transition-all duration-500 z-30 ${activeTab === "split" ? "translate-y-0" : "translate-y-20 opacity-0"}`}>
        <button onClick={handleSplitSubmit} disabled={isSubmitting} className="w-full py-6 rounded-[3rem] bg-primary text-black font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30">
          {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} 
          Create Split Session
        </button>
      </div>
    </div>
  )
}
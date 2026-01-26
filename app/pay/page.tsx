"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  QrCode, Scan, CheckCircle, ArrowLeft, Loader2, 
  Camera, X, Plus, Trash2, Search, UserPlus, Send, Check, Receipt 
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuQRPayment } from "@/hooks/useSakuQRPayment"
import { useBalance } from "@/hooks/useBalance"
import { useSakuTransfer } from "@/hooks/useSakuTransfer"
import { QRCodeSVG } from "qrcode.react" 
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"

interface Member { phone_number: string; full_name: string; }
interface BillItem { id: string; name: string; price: number; }

export default function PayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { generateQR, claimPayment, loading: qrLoading } = useSakuQRPayment()
  const { formattedBalance, refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [activeTab, setActiveTab] = useState<"receive" | "pay" | "split">("pay")

  const [amount, setAmount] = useState("")
  const [qrData, setQrData] = useState<string | null>(null)
  const [payInput, setPayInput] = useState("")
  const [success, setSuccess] = useState(false)
  const [isScannerActive, setIsScannerActive] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [description, setDescription] = useState("")
  const [tax, setTax] = useState("0")
  const [discount, setDiscount] = useState("0")
  const [items, setItems] = useState<BillItem[]>([{ id: crypto.randomUUID(), name: "", price: 0 }])
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
          toast.success("QR Detected! ✅"); 
          setTimeout(() => stopScanner(), 1000); 
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

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-card rounded-[3rem] p-12 shadow-2xl text-center space-y-6 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-black italic">Payment Sent!</h1>
          <button onClick={() => router.push("/home")} className="w-full py-5 rounded-3xl bg-black text-white font-bold active:scale-95 transition-all">Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <div className="p-6 flex items-center gap-4 border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-30">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors"><ArrowLeft /></button>
        <h1 className="text-xl font-black italic tracking-tighter">Finance Hub</h1>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="p-8 rounded-[3rem] bg-gradient-to-br from-black to-zinc-800 text-white text-center shadow-xl border border-white/5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 mb-1">Available IDRX</p>
          <p className="text-4xl font-black italic tracking-tighter">{formattedBalance}</p>
        </div>

        <div className="flex p-1.5 bg-muted rounded-[2rem] sticky top-20 z-20 border border-black/5 shadow-inner">
          {(["receive", "pay", "split"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white shadow-sm text-black" : "text-muted-foreground"}`}
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
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Amount to Request</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-muted/50 border-2 border-transparent focus:border-black/5 rounded-[2.5rem] px-8 py-5 text-2xl font-black outline-none transition-all" />
                </div>
                <button onClick={() => { if(!amount || Number(amount) <= 0) return; generateQR(user?.phone_number!, amount).then(r => r.success && setQrData(r.qrHash)) }} disabled={!amount || qrLoading} className="w-full py-6 rounded-[2.5rem] bg-black text-white font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30">
                  <QrCode size={18} /> Generate QR Link
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center p-10 bg-card rounded-[3.5rem] border border-border shadow-2xl space-y-6 animate-in zoom-in">
                <div className="p-8 bg-white rounded-[3rem] border-[16px] border-muted/20"><QRCodeSVG value={qrData} size={220} level="H" /></div>
                <div className="text-center"><p className="text-sm font-bold text-muted-foreground italic">Request: IDR {Number(amount).toLocaleString()}</p></div>
                <button onClick={() => setQrData(null)} className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] underline underline-offset-8">Generate New</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "pay" && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="relative w-full aspect-square overflow-hidden rounded-[4rem] bg-black border-4 border-muted/10 shadow-2xl flex items-center justify-center">
              <div id="reader" className="w-full h-full object-cover"></div>
              {!isScannerActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-8 text-center space-y-6">
                  <Camera className="w-16 h-16 opacity-20 animate-pulse" />
                  <button onClick={startScanner} className="px-10 py-4 bg-white text-black rounded-3xl font-black text-[10px] tracking-widest uppercase">Wake Camera</button>
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="relative">
                <input value={payInput} onChange={(e) => setPayInput(e.target.value)} placeholder="saku:pay:hash..." className="w-full bg-muted/50 rounded-[2.5rem] px-8 py-6 font-mono text-[10px] font-black outline-none border-2 border-transparent focus:border-black/5" />
                {payInput && <button onClick={() => setPayInput("")} className="absolute right-8 top-1/2 -translate-y-1/2 opacity-30"><X size={18} /></button>}
              </div>
              <button onClick={() => claimPayment(payInput).then(r => r.success && setSuccess(true))} disabled={qrLoading || !payInput} className="w-full py-6 rounded-[2.5rem] bg-black text-white font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30">
                <Scan size={18} /> Confirm Payment
              </button>
            </div>
          </div>
        )}

        {activeTab === "split" && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <section className="p-8 rounded-[3rem] bg-primary/5 border border-primary/10 space-y-5 shadow-inner">
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event Description..." className="w-full bg-transparent text-2xl font-black outline-none italic placeholder:opacity-10" />
              <div className="flex gap-6 border-t border-black/5 pt-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <div className="flex-1">Tax: <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full bg-transparent text-black outline-none font-black text-sm" /></div>
                <div className="flex-1">Discount (%): <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-transparent text-black outline-none font-black text-sm" /></div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em]">1. Add Menu</h3>
                <button onClick={() => setItems([...items, { id: crypto.randomUUID(), name: "", price: 0 }])} className="p-3 bg-black text-white rounded-[1.2rem] active:scale-90 transition-transform"><Plus size={16}/></button>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 px-2">
                    <input placeholder="Item name" value={item.name} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} className="flex-1 bg-muted/50 rounded-2xl px-5 py-4 font-black text-xs outline-none" />
                    <input type="number" placeholder="Price" value={item.price || ""} onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: Number(e.target.value)} : i))} className="w-32 bg-muted/50 rounded-2xl px-5 py-4 font-black text-xs outline-none" />
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="opacity-10 hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] px-4">2. Assign Party</h3>
              <div className="relative px-2">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Saku profiles..." className="w-full bg-muted/50 rounded-[2rem] pl-14 pr-6 py-5 font-black text-xs outline-none" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-2 right-2 mt-3 bg-white border border-black/5 rounded-[2.5rem] shadow-2xl z-30 p-3 animate-in fade-in duration-200">
                    {searchResults.map(p => (
                      <button key={p.phone_number} onClick={() => { setMembers([...members, p]); setSearchQuery(""); setSearchResults([]); setSelectedMemberPhone(p.phone_number); }} className="w-full text-left p-4 hover:bg-primary/5 rounded-[1.8rem] flex items-center gap-4 transition-colors">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-[10px]">{p.full_name.charAt(0)}</div>
                        <span className="font-black text-xs italic">{p.full_name}</span>
                        <UserPlus size={14} className="ml-auto opacity-20" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 px-2">
                {members.map(m => (
                  <button key={m.phone_number} onClick={() => setSelectedMemberPhone(m.phone_number)} className={`px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${selectedMemberPhone === m.phone_number ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
                    {m.full_name} ({assignments[m.phone_number]?.length || 0})
                  </button>
                ))}
              </div>
            </section>

            {selectedMemberPhone && (
              <section className="space-y-4 animate-in fade-in duration-500 pb-10">
                <div className="flex items-center gap-2 justify-center py-2 bg-primary/10 rounded-full mx-10">
                    <CheckCircle size={10} className="text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Assigning to {members.find(m => m.phone_number === selectedMemberPhone)?.full_name}</p>
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
                        className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all ${isSelected ? "bg-primary/5 border-primary shadow-inner" : "bg-white border-black/5"}`}
                      >
                        <div className="text-left"><p className="font-black text-sm italic">{item.name}</p></div>
                        {isSelected && <div className="p-1 bg-primary rounded-full text-white"><Check size={14} strokeWidth={4}/></div>}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-6 bg-background/80 backdrop-blur-xl border-t border-border z-30">
        {activeTab === "split" ? (
          <button onClick={handleSplitSubmit} disabled={isSubmitting} className="w-full py-6 rounded-[3rem] bg-black text-white font-black text-xs shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-30">
            {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} DISPATCH SETTLEMENT REQUEST
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 opacity-20 py-2">
            <Receipt size={10} />
            <span className="text-[8px] font-black uppercase tracking-[0.5em]">Saku Social Protocol</span>
          </div>
        )}
      </div>
    </div>
  )
}
"use client"

import { useEffect, useState, useRef } from "react"
import { 
  CheckCircle2, Copy, UserPlus, 
  Share2, Download, Loader2, Zap, Receipt as ReceiptIcon
} from "lucide-react"
import { useContacts } from "@/hooks/useContacts"
import { animated, useSpring } from "@react-spring/web"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import Image from "next/image"

interface SuccessStepProps {
  txHash: string | null
  receiverName: string
  receiverPhone: string
  amount: string
  billDescription: string // Tambahan untuk konteks split bill
  onComplete: () => void
}

export default function SuccessStep({ 
  txHash, 
  receiverName, 
  receiverPhone, 
  amount, 
  billDescription,
  onComplete 
}: SuccessStepProps) {
  const displayAmount = amount ? parseFloat(amount).toFixed(2) : "0.00"
  const [copied, setCopied] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  
  const receiptRef = useRef<HTMLDivElement>(null)
  const { contacts, addContact } = useContacts()

  // Animations
  const iconSpring = useSpring({
    from: { transform: 'scale(0.5) rotate(-20deg)', opacity: 0 },
    to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    config: { tension: 300, friction: 15 }
  })

  const textSpring = useSpring({
    from: { opacity: 0, translateY: 10 },
    to: { opacity: 1, translateY: 0 },
    delay: 300
  })

  const isAlreadyContact = contacts.some((c) => c.phone_number === receiverPhone)
  const shouldShowSaveButton = !isAlreadyContact && !contactSaved && receiverPhone && receiverName !== receiverPhone

  const handleCopyHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      setCopied(true)
      toast.success("Transaction hash copied")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current) return
    setIsGenerating(true)
    
    try {
      const dataUrl = await toPng(receiptRef.current, { 
        cacheBust: true,
        backgroundColor: '#1a1a1a', 
        pixelRatio: 3,
      })
      
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `SAKU-SPLIT-RECEIPT-${billDescription.replace(/\s+/g, '-').toUpperCase()}.png`
      link.click()
      toast.success("Receipt saved to gallery")
    } catch (err) {
      console.error(err)
      toast.error("Could not save receipt")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveContact = async () => {
    try {
      setSavingContact(true)
      const result = await addContact({ name: receiverName, phone_number: receiverPhone })
      if (result.success) {
        setContactSaved(true)
        toast.success("Contact added to Saku")
      }
    } catch (err) { } finally { setSavingContact(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-full max-w-lg mx-auto bg-white font-sans overflow-y-auto animate-in fade-in duration-500">
      <div className="p-8 pt-16 text-center space-y-6">
        <animated.div style={iconSpring} className="relative inline-block">
          <div className="absolute inset-0 bg-emerald-100 rounded-full scale-150 blur-2xl opacity-50" />
          <div className="relative bg-emerald-500 p-5 rounded-full shadow-xl shadow-emerald-200">
            <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
        </animated.div>

        <animated.div style={textSpring} className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight lowercase">portion settled!</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-black text-slate-900">{parseFloat(amount).toFixed(2)}</span>
            <span className="text-xl font-bold text-slate-400 uppercase">usdc</span>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Successfully paid to <span className="text-slate-900 font-bold">{receiverName.toLowerCase()}</span>
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
             <ReceiptIcon size={12} className="text-slate-400" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{billDescription}</span>
          </div>
        </animated.div>
      </div>

      <div className="px-6 space-y-3 mt-4">
        <button
          onClick={() => setShowReceiptModal(true)}
          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
        >
          <Share2 className="w-4 h-4 text-primary" />
          View & Share Receipt
        </button>

        {shouldShowSaveButton && (
          <button
            onClick={handleSaveContact}
            disabled={savingContact}
            className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            {savingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Save Creator as Contact
          </button>
        )}
      </div>

      <div className="mt-8 px-6">
        <div className="bg-slate-50 rounded-3xl p-5 space-y-4 border border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">On-Chain Proof</span>
            <button onClick={handleCopyHash} className="text-[10px] font-bold text-primary hover:opacity-70">
              {copied ? 'COPIED' : 'COPY HASH'}
            </button>
          </div>
          <p className="font-mono text-[10px] text-slate-500 break-all leading-relaxed bg-white p-3 rounded-xl border border-slate-200/50">
            {txHash || "Transaction verified on Arbitrum network"}
          </p>
        </div>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {/* <div className="flex items-center justify-center gap-2 text-slate-300">
            <Zap size={14} className="fill-slate-300" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Permanently settled</span>
        </div> */}
        <button
          onClick={onComplete}
          className="w-full py-4 rounded-2xl bg-primary text-slate-900 font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          done
        </button>
      </div>

      {/* DIGITAL RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm space-y-6">
            
            <div ref={receiptRef} className="p-4 bg-transparent">
              <div 
                className="relative bg-[#F9F9F9] text-slate-800 mx-auto"
                style={{ 
                    width: '320px', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                }}
              >
                {/* Sawtooth top border */}
                <div 
                  className="absolute -top-3 left-0 w-full h-3" 
                  style={{
                    backgroundImage: `linear-gradient(-45deg, #F9F9F9 6px, transparent 0), linear-gradient(45deg, #F9F9F9 6px, transparent 0)`,
                    backgroundSize: '12px 12px'
                  }}
                />

                <div className="p-8 pt-10 pb-10 space-y-6 flex flex-col items-center">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center mb-2">
                      <Image src="/logo.png" alt="Saku" width={42} height={42} className="grayscale contrast-125" />
                    </div>
                    <h3 className="text-sm font-black tracking-[0.3em] uppercase">Saku Split</h3>
                  </div>

                  <div className="w-full border-b border-dashed border-slate-300" />

                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlement Amount</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl font-black tracking-tighter text-slate-900">{parseFloat(amount).toFixed(2)}</span>
                      <span className="text-lg font-bold text-slate-900 uppercase">USDC</span>
                    </div>
                    <p className="text-[9px] font-mono font-bold text-emerald-600 mt-1 uppercase tracking-tighter flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" /> 
                      Settled on-chain
                    </p>
                  </div>

                  <div className="w-full space-y-3 font-mono text-[10px]">
                    <div className="flex justify-between border-t border-slate-200 pt-3">
                      <span className="text-slate-400 uppercase">Bill:</span>
                      <span className="font-bold text-right truncate ml-4 lowercase">"{billDescription}"</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase">Date:</span>
                      <span className="font-bold">{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                    </div>
                    <div className="w-full border-b border-dashed border-slate-200" />
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase">Creator:</span>
                      <span className="font-bold">{receiverName.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase">Recipient Phone:</span>
                      <span className="font-bold">+{receiverPhone}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-3">
                      <span className="text-slate-400 uppercase font-black">Status:</span>
                      <span className="font-black text-slate-900 uppercase">Fully Paid</span>
                    </div>
                  </div>

                  <div className="w-full space-y-4 pt-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 w-full bg-slate-900 flex gap-[1px] px-4 py-1.5 overflow-hidden">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div key={i} className="bg-white h-full" style={{ width: `${(i % 3) + 1}px`, opacity: i % 2 === 0 ? 1 : 0.7 }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-[9px] font-black italic text-slate-400 uppercase tracking-widest">--- Keep the vibes ---</p>
                  </div>
                </div>

                {/* Sawtooth bottom border */}
                <div 
                  className="absolute -bottom-3 left-0 w-full h-3" 
                  style={{
                    backgroundImage: `linear-gradient(-45deg, transparent 6px, #F9F9F9 0), linear-gradient(45deg, transparent 6px, #F9F9F9 0)`,
                    backgroundSize: '12px 12px'
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto px-4">
              <button 
                onClick={downloadReceipt}
                disabled={isGenerating}
                className="col-span-2 py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={18} />} 
                Save Proof to Gallery
              </button>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="col-span-2 py-2 text-white/40 font-bold text-[10px] hover:text-white transition-colors uppercase tracking-widest text-center"
              >
                close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
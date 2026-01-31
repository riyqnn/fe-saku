"use client"

import { useEffect, useState, useRef } from "react"
import { 
  CheckCircle, ExternalLink, Copy, Check, UserPlus, 
  Share2, Download, Loader2, MessageCircle, X, CheckCircle2 
} from "lucide-react"
import { useContacts } from "@/hooks/useContacts"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import Image from "next/image"

interface SuccessStepProps {
  txHash: string | null
  receiverName: string
  receiverPhone: string
  amount: string
  onComplete: () => void
}

export default function SuccessStep({ txHash, receiverName, receiverPhone, amount, onComplete }: SuccessStepProps) {
  const [showAnimation, setShowAnimation] = useState(true)
  const [copied, setCopied] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  
  const receiptRef = useRef<HTMLDivElement>(null)
  const { contacts, addContact } = useContacts()

  const isAlreadyContact = contacts.some((c) => c.phone_number === receiverPhone)
  const shouldShowSaveButton = !isAlreadyContact && !contactSaved && receiverPhone && receiverName !== receiverPhone

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleCopy = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current) return
    setIsGenerating(true)
    const loadingToast = toast.loading("Generating receipt...")
    try {
      const dataUrl = await toPng(receiptRef.current, { 
        cacheBust: true, 
        backgroundColor: '#f8f9fa',
        pixelRatio: 4 
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `SAKU-RECEIPT-${txHash?.slice(0, 8)}.png`
      link.click()
      toast.success("Saved to gallery!")
    } catch (err) {
      toast.error("Failed to generate image")
    } finally {
      toast.dismiss(loadingToast)
      setIsGenerating(false)
    }
  }

  // Helper function to convert base64 to Blob
  const base64ToBlob = (base64: string, type: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type });
  };

  const shareToWhatsApp = async () => {
    if (!receiptRef.current) return;

    setIsGenerating(true);
    const loadingToast = toast.loading("Preparing receipt...");

    try {
      // Generate PNG from receipt element
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#f8f9fa',
        pixelRatio: 4,
      });

      // Convert base64 to Blob directly
      const blob = base64ToBlob(dataUrl, 'image/png');

      // Create File object for sharing
      const file = new File(
        [blob],
        `Saku-Receipt-${txHash?.slice(0, 8)}.png`,
        { type: 'image/png' }
      );

      // Try Web Share API first (works on mobile - sends actual image)
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Saku Receipt',
        });
        toast.success("Receipt shared!");
      } else {
        // Fallback: Upload and share link (desktop)
        const filename = `Saku-Receipt-${txHash?.slice(0, 8)}.png`;
        const uploadRes = await fetch('/api/upload-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl, filename }),
        });

        if (!uploadRes.ok) {
          throw new Error('Upload failed');
        }

        const { url } = await uploadRes.json();

        // Share just the image link
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
        toast.success("Opening WhatsApp...");
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to share receipt.");
    } finally {
      toast.dismiss(loadingToast);
      setIsGenerating(false);
    }
  }

  const handleSaveContact = async () => {
    try {
      setSavingContact(true)
      const result = await addContact({ name: receiverName, phone_number: receiverPhone })
      if (result.success) setContactSaved(true)
    } catch (err) { } finally { setSavingContact(false) }
  }

  return (
    <div className="p-5 sm:p-8 space-y-6 text-center animate-fade-in-scale font-sans">
      {/* Success Icon */}
      <div className="py-4">
        <CheckCircle className="w-20 h-20 text-amber-600 mx-auto" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Transfer Successful!</h2>
        <p className="text-sm font-bold text-black/50">
          Rp {Number(amount).toLocaleString()} IDRX sent to {receiverName}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => setShowReceiptModal(true)}
          className="w-full py-4 rounded-2xl bg-black text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4 text-primary" />
          SHARE RECEIPT
        </button>

        {shouldShowSaveButton && (
          <button
            onClick={handleSaveContact}
            disabled={savingContact}
            className="w-full py-4 rounded-2xl bg-primary/10 border-2 border-primary/20 text-black font-bold text-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4 text-primary" />
            {savingContact ? "SAVING..." : `SAVE ${receiverName.toUpperCase()}`}
          </button>
        )}
      </div>

      {/* Transaction Details Minimal Card */}
      <div className="bg-muted/40 rounded-[2rem] p-6 border border-black/5 space-y-4">
        <div className="space-y-2 text-left">
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-[0.2em]">Transaction Hash</p>
          <p className="font-mono text-[10px] font-bold text-black/60 break-all bg-white/50 p-3 rounded-xl border border-black/5">
            {txHash || "Processing..."}
          </p>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-6 rounded-[2.5rem] bg-primary text-black font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all italic"
      >
        Done
      </button>

      {/* Receipt Modal (The Struk Style) */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm flex flex-col gap-6">
            <div 
              ref={receiptRef}
              className="bg-white text-black p-10 rounded-[2.5rem] shadow-2xl space-y-8 relative overflow-hidden text-left"
            >
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)`
              }}></div>
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Image src="/logo.png" alt="Saku" width={40} height={40} className="grayscale" />
                  <p className="text-[8px] font-bold tracking-[0.2em] text-black/30 uppercase">Official Receipt</p>
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[10px] font-bold">Saku Wallet</p>
                   <p className="text-[8px] font-semibold text-black/30">Ref: #{txHash?.slice(0,8)}</p>
                </div>
              </div>

              <div className="flex flex-col items-center py-4 text-center border-y border-dashed border-black/10">
                <CheckCircle2 size={48} className="text-green-500 mb-4" strokeWidth={3} />
                <h2 className="text-[10px] font-bold tracking-[0.3em] text-black/40 uppercase mb-1">Transaction Successful</h2>
                <p className="text-5xl font-black tracking-tighter mb-1">IDR {Number(amount).toLocaleString()}</p>
                <p className="text-[9px] font-semibold text-black/20">{new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Payment Type', value: 'Transfer Sent' },
                  { label: 'Sent To', value: receiverName },
                  { label: 'Phone', value: receiverPhone },
                  { label: 'Amount', value: `IDR ${Number(amount).toLocaleString()}` },
                  { label: 'Fee', value: 'IDR 0' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px] items-center">
                    <span className="text-black/30 font-bold tracking-widest uppercase text-[9px]">{item.label}</span>
                    <span className="font-semibold italic text-black/80">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-dashed border-black/10 text-center space-y-4">
                 <div className="space-y-1">
                    <p className="text-[7px] font-bold text-black/20 tracking-widest uppercase">Digital Signature</p>
                    <p className="text-[7px] font-mono text-black/30 break-all px-6">{txHash}</p>
                 </div>
                 <p className="text-[8px] font-semibold italic text-black/30">Keep this receipt as your official proof of payment.</p>
              </div>
              
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-black/80 rounded-full shadow-inner"></div>
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-black/80 rounded-full shadow-inner"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={shareToWhatsApp}
                className="col-span-2 py-5 bg-[#25D366] text-white rounded-3xl font-bold text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all tracking-widest"
              >
                <MessageCircle size={20} fill="white" /> Whatsapp
              </button>
              
              <button 
                onClick={downloadReceipt}
                disabled={isGenerating}
                className="py-5 bg-white text-black rounded-3xl font-bold text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all tracking-widest"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                Save Image
              </button>

              <button 
                onClick={() => setShowReceiptModal(false)} 
                className="py-5 bg-black text-white rounded-3xl font-bold text-[10px] flex items-center justify-center gap-2 tracking-widest"
              >
                <X size={16} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
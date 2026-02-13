"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import Image from "next/image"
import { X, Download, MessageCircle, CheckCircle2 } from "lucide-react"

export default function ReceiptModal({ selectedTx, onClose }: { selectedTx: any, onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  }

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
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#f8f9fa', pixelRatio: 4 });
      const blob = base64ToBlob(dataUrl, 'image/png');
      const file = new File([blob], `Saku-Receipt-${String(selectedTx.id).slice(0, 8)}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Saku Receipt' });
      } else {
        const uploadRes = await fetch('/api/upload-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl, filename: `Saku-Receipt-${String(selectedTx.id).slice(0, 8)}.png` }),
        });
        const { url } = await uploadRes.json();
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
      }
      toast.success("Done!");
    } catch (err) {
      toast.error("Failed to share.");
    } finally {
      toast.dismiss(loadingToast);
      setIsGenerating(false);
    }
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#f8f9fa', pixelRatio: 4 })
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `SAKU-RECEIPT-${String(selectedTx.id).slice(0, 8)}.png`;
      link.click();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/50 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xs flex flex-col gap-4">
        <div ref={receiptRef} className="bg-white text-black p-6 rounded-[2.5rem] shadow-2xl space-y-5 relative">
          <div className="flex justify-between items-start">
            <Image src="/logo.png" alt="Saku" width={36} height={36} className="grayscale" />
            <p className="text-[8px] font-bold text-black/30">Ref: #{String(selectedTx.id).slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="flex flex-col items-center py-4 text-center border-y border-dashed border-black/10">
            <CheckCircle2 size={48} className="text-green-500 mb-4" strokeWidth={3} />
            <p className="text-4xl font-black tracking-tighter italic">IDR {selectedTx.amount.toLocaleString()}</p>
            <p className="text-[9px] font-black text-black/20">{formatTime(selectedTx.timestamp)}</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[11px]">
              <span className="text-black/30 font-black italic">TYPE</span>
              <span className="font-black italic">{selectedTx.type?.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-dashed border-black/10 text-center">
            <p className="text-[7px] font-mono text-black/30 break-all">{selectedTx.tx_hash}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={shareToWhatsApp} className="col-span-2 py-5 bg-[#25D366] text-white rounded-[2rem] font-black text-xs flex items-center justify-center gap-3">
            <MessageCircle size={20} fill="white" /> Share to WA
          </button>
          <button onClick={downloadReceipt} className="py-5 bg-white text-black rounded-[2rem] font-black text-[10px] flex items-center justify-center gap-2">
            <Download size={16} /> Save PNG
          </button>
          <button onClick={onClose} className="py-5 bg-black text-white rounded-[2rem] font-black text-[10px]">
            <X size={16} className="mx-auto" />
          </button>
        </div>
      </div>
    </div>
  )
}

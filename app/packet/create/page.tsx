"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Gift, Loader2, Sparkles, Copy, Check, Share2,
  Users, Shuffle, Divide, Download, Home, Palette
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import { generatePacketCode } from "@/hooks/usePacket"
import { motion, AnimatePresence } from "framer-motion"

// Konfigurasi Desain Dompet/Amplop
const PACKET_DESIGNS = [
  { id: 'classic', name: 'Classic Red', color: 'bg-red-600', emoji: '🧧' },
  { id: 'gold', name: 'Royal Gold', color: 'bg-amber-500', emoji: '✨' },
  { id: 'modern', name: 'Modern Saku', color: 'bg-primary', emoji: '💳' },
  { id: 'dark', name: 'Midnight', color: 'bg-slate-900', emoji: '🌑' },
];

export default function CreatePacketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { formattedBalance } = useBalance(user?.wallet_address || null)
  const qrRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [maxWinners, setMaxWinners] = useState("10")
  const [distributionType, setDistributionType] = useState<"EQUAL" | "RANDOM">("RANDOM")
  const [selectedDesign, setSelectedDesign] = useState(PACKET_DESIGNS[0])
  const [createdPacket, setCreatedPacket] = useState<{
    packetCode: string
    shareLink: string
  } | null>(null)

  const handleCreatePacket = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter amount")
    
    setIsLoading(true)
    const autoGenCode = generatePacketCode(8)

    try {
      const token = localStorage.getItem("saku_auth_token")
      const response = await fetch("/api/packet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          packetCode: autoGenCode,
          totalAmount: parseFloat(amount),
          maxWinners: parseInt(maxWinners),
          distributionType,
          designId: selectedDesign.id // Mengirim ID desain ke backend
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setCreatedPacket({ packetCode: data.packetCode, shareLink: data.shareLink })
      toast.success("Packet Created!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (createdPacket) {
    // ... UI Success (Sama seperti sebelumnya, tambahkan warna selectedDesign di kartu sukses)
    return <SuccessUI createdPacket={createdPacket} design={selectedDesign} router={router} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <Header />
      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        {/* Desain Preview Animasi */}
        <motion.div 
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className={`p-10 rounded-[3rem] ${selectedDesign.color} shadow-2xl flex flex-col items-center justify-center text-white space-y-4`}
        >
          <span className="text-6xl">{selectedDesign.emoji}</span>
          <p className="font-bold tracking-widest text-[10px] uppercase opacity-60">Preview Packet</p>
        </motion.div>

        {/* Pilihan Desain */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-black/40 tracking-widest uppercase flex items-center gap-2">
            <Palette size={12} /> Choose Design
          </label>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {PACKET_DESIGNS.map((design) => (
              <button
                key={design.id}
                onClick={() => setSelectedDesign(design)}
                className={`flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedDesign.id === design.id ? 'ring-4 ring-primary bg-white shadow-lg' : 'bg-muted opacity-60'
                }`}
              >
                <span className="text-2xl">{design.emoji}</span>
                <span className="text-[8px] font-bold uppercase">{design.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Amount & Winners */}
        <div className="space-y-6 bg-white p-6 rounded-[2.5rem] shadow-xl border border-black/5">
          <div className="space-y-1 text-center">
            <p className="text-[10px] font-bold text-black/30 uppercase">Total Amount</p>
            <input 
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0" className="w-full text-center text-5xl font-black outline-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-black/5 pt-4">
            <span className="text-sm font-bold flex items-center gap-2"><Users size={16}/> Winners</span>
            <input 
              type="number" value={maxWinners} onChange={(e) => setMaxWinners(e.target.value)}
              className="w-12 text-right font-black text-lg outline-none bg-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleCreatePacket}
          disabled={isLoading || !amount}
          className="w-full py-6 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl active:scale-95 transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : "Create Dana Kaget"}
        </button>
      </div>
    </div>
  )
}

// Komponen Pembantu Success UI
function SuccessUI({ createdPacket, design, router }: any) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className={`w-full max-w-sm ${design.color} p-10 rounded-[3rem] shadow-2xl text-white`}>
                <span className="text-7xl mb-4 block">{design.emoji}</span>
                <h2 className="text-2xl font-bold italic">Ready to Share!</h2>
                <p className="text-white/60 text-xs mt-2">{createdPacket.packetCode}</p>
            </div>
            <button onClick={() => router.push("/home")} className="w-full py-4 bg-black text-white rounded-2xl font-bold">Home</button>
        </div>
    )
}
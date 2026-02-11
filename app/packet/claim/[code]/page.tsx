"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Gift, Loader2, CheckCircle, AlertCircle, Users,
  Clock, Sparkles, Home, ArrowRight
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import { motion, AnimatePresence } from "framer-motion"

interface PacketInfo {
  packetCode: string
  creator: string
  totalAmount: string
  remainingAmount: string
  maxWinners: number
  winnerCount: number
  distributionType: string
  status: string
  createdAt: string
  expiresAt: string
  exists: boolean
  hasClaimed: boolean
}

export default function ClaimPacketPage() {
  const router = useRouter()
  const params = useParams()
  const packetCode = params.code as string

  const { user } = useAuth()
  const { refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [packet, setPacket] = useState<PacketInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null)

  useEffect(() => {
    fetchPacketInfo()
  }, [packetCode])

  // --- HELPER FUNCTION (PENYEBAB ERROR) ---
  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m remaining`
  }

  const fetchPacketInfo = async () => {
    if (!packetCode) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/packet/${packetCode}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setPacket(data.packet)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenPacket = () => {
    if (isOpening || isClaiming || claimedAmount || packet?.hasClaimed) return
    
    if (!user) {
      toast.error("Please login to claim this packet")
      router.push("/get-started")
      return
    }

    setIsOpening(true)
    
    // Jalankan klaim setelah animasi flap terbuka
    setTimeout(() => {
      executeClaim()
    }, 800)
  }

  const executeClaim = async () => {
    setIsClaiming(true)
    try {
      const token = localStorage.getItem("saku_auth_token")
      const response = await fetch("/api/packet/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ packetCode }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to claim")

      setClaimedAmount(data.claimedAmount)
      refetchBalance()
      toast.success(`Dapet Rp ${parseFloat(data.claimedAmount).toLocaleString()}!`)
    } catch (err: any) {
      setIsOpening(false)
      toast.error(err.message)
    } finally {
      setIsClaiming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !packet) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">Packet Not Found</h1>
        <p className="text-black/50 mb-6 font-medium">{error}</p>
        <button onClick={() => router.push("/home")} className="px-8 py-3 bg-black text-white rounded-2xl font-bold">Back Home</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans relative">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {!claimedAmount && !packet.hasClaimed ? (
            /* --- TAMPILAN DOMPET (SEBELUM KLAIM) --- */
            <motion.div
              key="envelope-view"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="w-full flex flex-col items-center space-y-10"
            >
              <div className="relative w-64 h-80 perspective-1000">
                <motion.div
                  animate={isOpening ? { 
                    rotateY: [0, -10, 10, 0],
                    scale: [1, 1.05, 1],
                  } : { 
                    y: [0, -12, 0],
                  }}
                  transition={{ repeat: isOpening ? 0 : Infinity, duration: 2.5 }}
                  onClick={handleOpenPacket}
                  className="relative w-full h-full cursor-pointer"
                >
                  {/* Body Belakang */}
                  <div className="absolute inset-0 bg-red-700 rounded-3xl shadow-2xl" />
                  
                  {/* Kertas Saku (Muncul saat flap terbuka) */}
                  <motion.div 
                    initial={{ y: 0 }}
                    animate={isOpening ? { y: -110 } : { y: 0 }}
                    className="absolute top-4 left-6 right-6 h-48 bg-white rounded-xl shadow-inner flex flex-col items-center justify-center border-t-4 border-primary"
                  >
                     <p className="font-black text-primary text-2xl italic tracking-tighter">SAKU</p>
                     <div className="w-8 h-1 bg-primary/10 rounded-full mt-2" />
                  </motion.div>

                  {/* Body Depan */}
                  <div className="absolute inset-0 bg-red-600 rounded-3xl flex flex-col items-center justify-center border-t-4 border-red-500/20 overflow-hidden">
                    {/* Flap (Tutup) */}
                    <motion.div 
                      animate={isOpening ? { rotateX: -150, originY: 0, zIndex: 10 } : { rotateX: 0, zIndex: 30 }}
                      transition={{ duration: 0.6 }}
                      className="absolute top-0 inset-x-0 h-1/2 bg-red-700 rounded-b-[4rem] shadow-lg flex justify-center pt-5"
                    >
                        <div className="w-12 h-12 bg-yellow-500 rounded-full border-4 border-red-600 shadow-xl flex items-center justify-center">
                            <span className="text-white text-xl font-bold">福</span>
                        </div>
                    </motion.div>

                    <Gift size={64} className="text-white/10 mt-12" />
                    <p className="text-white/80 font-black italic mt-6 tracking-[0.2em] text-[10px] uppercase">Tap to Open</p>
                  </div>
                </motion.div>

                {isClaiming && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/5 backdrop-blur-[2px] rounded-3xl">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Dana Kaget!</h2>
                <div className="flex items-center justify-center gap-5 text-[11px] font-bold text-black/30">
                  <span className="flex items-center gap-1.5"><Users size={14} className="text-primary"/> {packet.winnerCount}/{packet.maxWinners}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary"/> {formatTimeRemaining(packet.expiresAt)}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- TAMPILAN BERHASIL / SUDAH KLAIM --- */
            <motion.div
              key="result-view"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-sm bg-white rounded-[3.5rem] p-10 shadow-2xl text-center space-y-8 border border-black/5"
            >
              <div className="space-y-3">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-black italic tracking-tighter">
                    {packet.hasClaimed && !claimedAmount ? "Already Taken!" : "YOU GOT IT!"}
                </h1>
                <p className="text-black/40 text-sm font-medium leading-relaxed">
                    {packet.hasClaimed && !claimedAmount 
                        ? "Kamu sudah mengambil jatah kamu di amplop ini." 
                        : "Saldo IDRX telah berhasil ditambahkan ke dompetmu."}
                </p>
              </div>

              {(claimedAmount || packet.hasClaimed) && (
                <div className="py-8 bg-muted/40 rounded-[2.5rem] border-2 border-dashed border-black/5 relative overflow-hidden">
                    <Sparkles className="absolute top-4 right-4 text-primary/20" size={20} />
                    <p className="text-[10px] font-bold text-black/30 tracking-[0.2em] uppercase mb-2">Amount Received</p>
                    <p className="text-5xl font-black text-black tracking-tighter">
                        <span className="text-xl mr-1 italic text-primary">Rp</span>
                        {parseFloat(claimedAmount || "0").toLocaleString()}
                    </p>
                </div>
              )}

              <div className="grid gap-3">
                <button
                  onClick={() => router.push("/home")}
                  className="w-full py-5 rounded-2xl bg-black text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-black/10"
                >
                  <Home size={18} /> Back to Home
                </button>
                <button
                  onClick={() => router.push("/transactions")}
                  className="w-full py-5 rounded-2xl bg-muted font-bold flex items-center justify-center gap-2 hover:bg-black/5 transition-all"
                >
                  View Transactions <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="p-8 text-center">
        <p className="text-[9px] font-bold text-black/10 uppercase tracking-[0.3em]">Saku Crypto Wallet • Web3 Technology</p>
      </div>
    </div>
  )
}
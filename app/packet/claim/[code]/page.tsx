"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Gift, Loader2, CheckCircle, AlertCircle, 
  Sparkles, Home, ArrowRight, Wallet, ShieldCheck, Clock
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import EnvelopeAnimation from "@/components/packet/envelope-animation"
import { PACKET_THEMES } from "@/lib/packet-themes"

interface PacketInfo {
  packetCode: string
  themeId: string
  maxWinners: number
  winnerCount: number
  expiresAt: string
  hasClaimed: boolean
  totalAmount: string
}

export default function ClaimPacketPage() {
  const router = useRouter()
  const params = useParams()
  const packetCode = params.code as string

  const { user } = useAuth()
  const { refetch: refetchBalance } = useBalance(user?.wallet_address || null)

  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [packet, setPacket] = useState<PacketInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchPacketInfo()
  }, [packetCode])

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

  const handleClaim = async () => {
    if (!user) {
      toast.error("Please login first!")
      router.push("/get-started")
      return
    }

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
      if (!response.ok) throw new Error(data.error || "Claim failed")

      setIsOpen(true)
      
      setTimeout(() => {
        setClaimedAmount(data.claimedAmount)
        refetchBalance()
      }, 1200)

    } catch (err: any) {
      toast.error(err.message)
      setIsClaiming(false)
    }
  }

  const currentTheme = PACKET_THEMES.find(t => t.id === packet?.themeId) || PACKET_THEMES[0]

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary mb-4" size={40} />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fetching your gift...</p>
    </div>
  )

  if (error || !packet) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-black tracking-tight mb-2">Packet Not Found</h1>
      <p className="text-muted-foreground mb-8 text-sm max-w-[250px]">{error || "This packet doesn't exist or has expired."}</p>
      <button onClick={() => router.push("/home")} className="w-full max-w-[200px] py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg shadow-primary/20">Back Home</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans relative overflow-hidden">
      <Header title="Claim Packet" />

      {/* Dynamic Background Mesh based on Theme */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] blur-[120px] rounded-full opacity-20"
          style={{ backgroundColor: currentTheme.colors.primary }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait">
          {!claimedAmount ? (
            /* --- STATE 1: REVEAL ENVELOPE --- */
            <motion.div 
              key="reveal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full flex flex-col items-center space-y-10"
            >
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">You received a gift!</p>
                <h2 className="text-3xl font-black tracking-tighter">Open Your Packet</h2>
              </div>

              {/* Theme-based Envelope */}
              <div className="w-full max-w-[280px] drop-shadow-2xl">
                <EnvelopeAnimation
                  theme={currentTheme}
                  isOpen={isOpen}
                  onOpen={handleClaim}
                  size="custom"
                />
              </div>

              <div className="w-full max-w-[300px] space-y-6">


                 <button
                  onClick={handleClaim}
                  disabled={isClaiming || isOpen}
                  className="w-full py-5 bg-primary text-primary-foreground rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isClaiming ? <Loader2 className="animate-spin" size={24} /> : "OPEN PACKET"}
                </button>
              </div>
            </motion.div>
          ) : (
            /* --- STATE 2: SUCCESS RECEIPT --- */
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet size={48} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg border-4 border-white">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Claim Successful</p>
                  <h1 className="text-5xl font-black text-foreground tracking-tighter">
                    {parseFloat(claimedAmount).toFixed(2)} <span className="text-primary/60 text-2xl">USDC</span>
                  </h1>
                </div>

                <div className="bg-muted/30 rounded-[2rem] p-6 space-y-4 border border-border/50 text-left">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">From</span>
                    <span className="font-bold text-foreground">Saku Packet</span>
                  </div>
                  <div className="h-px bg-border/50 w-full" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Status</span>
                    <span className="text-green-600 font-black text-[10px] tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/> 
                        Confirmed
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 pt-4">
                  <button
                    onClick={() => router.push("/home")}
                    className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    <Home size={18} /> Go To Wallet
                  </button>
                  <button
                    onClick={() => router.push("/transactions")}
                    className="w-full py-5 rounded-2xl bg-muted font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    View Transaction <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  )
}
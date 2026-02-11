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
  const [packet, setPacket] = useState<PacketInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null)

  useEffect(() => {
    fetchPacketInfo()
  }, [packetCode])

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    if (diff <= 0) return "Expired"
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}j ${minutes}m`
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

  const handleClaim = async () => {
    if (!user) {
      toast.error("Login dulu bosku!")
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
      if (!response.ok) throw new Error(data.error || "Gagal klaim")

      setClaimedAmount(data.claimedAmount)
      refetchBalance()
      toast.success("Berhasil klaim!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsClaiming(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  )

  if (error || !packet) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-xl font-bold">Packet Not Found</h1>
      <p className="text-black/50 mb-6 font-medium">{error || "Packet tidak ditemukan."}</p>
      <button onClick={() => router.push("/home")} className="px-8 py-3 bg-black text-white rounded-2xl font-bold">Back Home</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col max-w-lg mx-auto border-x border-border font-sans relative">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!claimedAmount && !packet.hasClaimed ? (
          /* --- TAMPILAN KARTU KLAIM STATIS --- */
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-xl border border-black/5">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Gift className="text-primary" size={32} />
                </div>
                <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em] mb-1">Saku Reward</p>
                <h3 className="text-2xl font-black italic text-primary leading-none uppercase">Dana Kaget</h3>
                <p className="text-xs text-black/40 mt-3 font-bold tracking-widest">{packet.packetCode}</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-[11px] font-bold text-black/40 uppercase">
                  <span>Status Kuota</span>
                  <span>{packet.winnerCount}/{packet.maxWinners}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${(packet.winnerCount / packet.maxWinners) * 100}%` }} 
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-black/30 uppercase">
                   <Clock size={12}/> Berakhir dalam: {formatTimeRemaining(packet.expiresAt)}
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full py-5 bg-black text-white rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Mengklaim...
                  </>
                ) : (
                  "KLAIM SEKARANG"
                )}
              </button>
            </div>
          </div>
        ) : (
          /* --- TAMPILAN SETELAH BERHASIL KLAIM --- */
          <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-xl text-center space-y-8 border border-black/5">
            <div className="space-y-3">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase">
                  {packet.hasClaimed && !claimedAmount ? "Sudah Diambil" : "Berhasil!"}
              </h1>
              <p className="text-black/40 text-sm font-medium">
                {packet.hasClaimed && !claimedAmount 
                  ? "Kamu sudah mengambil jatah kamu di amplop ini." 
                  : "Saldo IDRX telah berhasil ditambahkan ke dompetmu."}
              </p>
            </div>

            {(claimedAmount || packet.hasClaimed) && (
              <div className="py-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 relative">
                <Sparkles className="absolute top-4 right-4 text-primary/20" size={20} />
                <p className="text-[10px] font-bold text-primary/60 tracking-widest uppercase mb-2">Jumlah Diterima</p>
                <p className="text-5xl font-black text-black tracking-tighter">
                  <span className="text-xl mr-1 italic text-primary">Rp</span>
                  {parseFloat(claimedAmount || "0").toLocaleString()}
                </p>
              </div>
            )}

            <div className="grid gap-3">
              <button
                onClick={() => router.push("/home")}
                className="w-full py-5 rounded-2xl bg-black text-white font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Home size={18} /> Balik Beranda
              </button>
              <button
                onClick={() => router.push("/transactions")}
                className="w-full py-5 rounded-2xl bg-muted font-bold flex items-center justify-center gap-2"
              >
                Lihat Transaksi <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>

      <div className="p-8 text-center mt-auto">
        <p className="text-[9px] font-bold text-black/10 uppercase tracking-[0.3em] italic">Powered by Saku Web3</p>
      </div>
    </div>
  )
}
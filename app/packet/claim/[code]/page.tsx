"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Gift, Loader2, CheckCircle, AlertCircle, Users,
  Clock, Sparkles
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

  const fetchPacketInfo = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("saku_auth_token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(`/api/packet/${packetCode}`, {
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Packet not found")
      }

      setPacket(data.packet)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!user) {
      toast.error("Please login to claim this packet")
      router.push("/get-started")
      return
    }

    setIsClaiming(true)

    try {
      const token = localStorage.getItem("saku_auth_token")
      if (!token) {
        toast.error("Please login first")
        router.push("/get-started")
        return
      }

      const response = await fetch("/api/packet/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ packetCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim packet")
      }

      setClaimedAmount(data.claimedAmount)
      refetchBalance()
      toast.success(`You got Rp ${parseFloat(data.claimedAmount).toLocaleString()}!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsClaiming(false)
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-black/50">Loading packet...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !packet) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold">Packet Not Found</h1>
            <p className="text-black/50">{error || "This packet code doesn't exist or has expired."}</p>
            <button
              onClick={() => router.push("/home")}
              className="px-8 py-4 rounded-2xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all"
            >
              Back Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state (after claiming)
  if (claimedAmount) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-6 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold italic">You Got It!</h1>
          <div className="py-4">
            <p className="text-[10px] font-bold text-black/40 tracking-widest uppercase">Claimed Amount</p>
            <p className="text-4xl font-bold text-black/85 mt-2">Rp {parseFloat(claimedAmount).toLocaleString()}</p>
          </div>
          <p className="text-black/50">The funds have been added to your wallet.</p>
          <button
            onClick={() => router.push("/home")}
            className="w-full py-4 rounded-2xl bg-primary font-bold shadow-lg active:scale-95 transition-all"
          >
            Back Home
          </button>
        </div>
      </div>
    )
  }

  // Already claimed state
  if (packet.hasClaimed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-6 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold italic">Already Claimed!</h1>
          <p className="text-black/50">You've already claimed this packet.</p>
          <button
            onClick={() => router.push("/home")}
            className="w-full py-4 rounded-2xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all"
          >
            Back Home
          </button>
        </div>
      </div>
    )
  }

  // Main claim view
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <Header />

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Packet Card */}
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 shadow-xl shadow-primary/20">
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Gift className="w-7 h-7 text-amber-900" />
            </div>
            <p className="text-[10px] font-bold text-amber-900/60 tracking-widest uppercase">Packet Code</p>
            <p className="text-2xl font-bold text-amber-900 tracking-wider mt-1">{packet.packetCode}</p>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold text-amber-900/60 tracking-widest uppercase">Total Amount</p>
            <p className="text-3xl font-bold text-amber-900 tracking-tighter mt-1">
              Rp {parseFloat(packet.totalAmount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Packet Info */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-black/40" />
              <span className="text-sm text-black/60">Winners</span>
            </div>
            <span className="font-bold">{packet.winnerCount}/{packet.maxWinners}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-black/40" />
              <span className="text-sm text-black/60">Type</span>
            </div>
            <span className="font-bold">{packet.distributionType}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-black/40" />
              <span className="text-sm text-black/60">Expires</span>
            </div>
            <span className="font-bold text-sm">{formatTimeRemaining(packet.expiresAt)}</span>
          </div>

          {packet.status !== "ACTIVE" && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl text-center">
              <p className="text-red-600 font-bold text-sm">
                This packet is {packet.status.toLowerCase()}
              </p>
            </div>
          )}
        </div>

        {/* Claim Button */}
        {packet.status === "ACTIVE" && !packet.hasClaimed && (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full py-6 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
          >
            {isClaiming ? (
              <>
                <Loader2 className="animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift size={20} />
                Claim Packet
              </>
            )}
          </button>
        )}

        {/* Login Prompt */}
        {!user && (
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <p className="text-amber-800 text-sm">
              Please login to claim this packet
            </p>
            <button
              onClick={() => router.push("/get-started")}
              className="mt-3 px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm"
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

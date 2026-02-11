"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Gift, Loader2, Copy, Check, Share2, Clock,
  Users, Sparkles, AlertCircle
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import Header from "@/components/layout/Header"

interface Packet {
  id: string
  packet_code: string
  total_amount: number
  remaining_amount: number
  max_winners: number
  winner_count: number
  distribution_type: string
  status: string
  contract_expires_at: string
  created_at: string
  shareLink: string
  claimCount: number
  isExpired: boolean
  isFullyClaimed: boolean
}

export default function MyPacketsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [packets, setPackets] = useState<Packet[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPackets()
    }
  }, [user])

  const fetchPackets = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem("saku_auth_token")
      if (!token) {
        router.push("/get-started")
        return
      }

      const response = await fetch("/api/packet/my-packets", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch packets")
      }

      setPackets(data.packets || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (packet: Packet) => {
    navigator.clipboard.writeText(packet.shareLink)
    setCopiedId(packet.id)
    toast.success("Link copied!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleShare = async (packet: Packet) => {
    const shareData = {
      title: 'Saku Packet',
      text: `Claim your red envelope! Code: ${packet.packet_code}`,
      url: packet.shareLink,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopy(packet)
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const getStatusColor = (packet: Packet) => {
    if (packet.status === "CANCELLED") return "bg-red-100 text-red-700"
    if (packet.isExpired || packet.status === "EXPIRED") return "bg-amber-100 text-amber-700"
    if (packet.isFullyClaimed || packet.status === "CLAIMED") return "bg-green-100 text-green-700"
    return "bg-primary/20 text-amber-900"
  }

  const getStatusText = (packet: Packet) => {
    if (packet.status === "CANCELLED") return "Cancelled"
    if (packet.isExpired || packet.status === "EXPIRED") return "Expired"
    if (packet.isFullyClaimed || packet.status === "CLAIMED") return "Fully Claimed"
    return "Active"
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Login Required</h2>
            <p className="text-black/50">Please login to view your packets</p>
            <button
              onClick={() => router.push("/get-started")}
              className="px-8 py-4 rounded-2xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <Header />

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold italic">My Packets</h1>
            <p className="text-black/50 text-sm">Manage your created packets</p>
          </div>
          <button
            onClick={() => router.push("/packet/create")}
            className="px-4 py-2 bg-primary rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            <Gift size={16} />
            Create
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-black/50 mt-4">Loading packets...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && packets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2rem] shadow-lg p-8">
            <Gift className="w-16 h-16 text-black/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">No Packets Yet</h3>
            <p className="text-black/50 mb-6">Create your first packet to share with others!</p>
            <button
              onClick={() => router.push("/packet/create")}
              className="px-8 py-4 rounded-2xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all"
            >
              Create Packet
            </button>
          </div>
        )}

        {/* Packet List */}
        {!isLoading && packets.length > 0 && (
          <div className="space-y-4">
            {packets.map((packet) => (
              <div
                key={packet.id}
                className="bg-white rounded-[2rem] p-5 shadow-lg space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tracking-wider">{packet.packet_code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(packet)}`}>
                        {getStatusText(packet)}
                      </span>
                    </div>
                    <p className="text-[10px] text-black/40 mt-1">
                      Created {new Date(packet.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(packet)}
                      className="p-2 bg-muted rounded-xl hover:bg-primary/20 transition-all"
                    >
                      {copiedId === packet.id ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleShare(packet)}
                      className="p-2 bg-muted rounded-xl hover:bg-primary/20 transition-all"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-black/40 uppercase">Total</p>
                    <p className="font-bold text-sm mt-1">Rp {packet.total_amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-black/40 uppercase">Remaining</p>
                    <p className="font-bold text-sm mt-1">Rp {packet.remaining_amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-black/40 uppercase">Claims</p>
                    <p className="font-bold text-sm mt-1">{packet.winner_count}/{packet.max_winners}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-black/40">
                  <div className="flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>{packet.distribution_type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatTimeRemaining(packet.contract_expires_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

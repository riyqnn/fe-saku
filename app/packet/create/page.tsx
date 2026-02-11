"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Gift, Loader2, Sparkles, Copy, Check, Share2,
  RefreshCw, Users, Shuffle, Divide
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import { generatePacketCode, PacketDistributionType } from "@/hooks/usePacket"

export default function CreatePacketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { formattedBalance } = useBalance(user?.wallet_address || null)

  const [isLoading, setIsLoading] = useState(false)
  const [packetCode, setPacketCode] = useState("")
  const [amount, setAmount] = useState("")
  const [maxWinners, setMaxWinners] = useState("10")
  const [distributionType, setDistributionType] = useState<"EQUAL" | "RANDOM">("RANDOM")
  const [createdPacket, setCreatedPacket] = useState<{
    packetCode: string
    shareLink: string
    transactionHash: string
    expiresAt: string
  } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const handleGenerateCode = () => {
    setPacketCode(generatePacketCode(8))
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!createdPacket) return

    const shareData = {
      title: 'Saku Packet',
      text: `Claim your red envelope! Code: ${createdPacket.packetCode}`,
      url: createdPacket.shareLink,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy(createdPacket.shareLink)
    }
  }

  const handleCreatePacket = async () => {
    if (!packetCode || packetCode.length < 4) {
      toast.error("Packet code must be at least 4 characters")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!maxWinners || parseInt(maxWinners) < 1 || parseInt(maxWinners) > 500) {
      toast.error("Max winners must be between 1 and 500")
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("saku_auth_token")
      if (!token) {
        toast.error("Please login first")
        router.push("/get-started")
        return
      }

      const response = await fetch("/api/packet/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          packetCode,
          totalAmount: parseFloat(amount),
          maxWinners: parseInt(maxWinners),
          distributionType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create packet")
      }

      setCreatedPacket({
        packetCode: data.packetCode,
        shareLink: data.shareLink,
        transactionHash: data.transactionHash,
        expiresAt: data.expiresAt,
      })

      toast.success("Packet created successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to create packet")
    } finally {
      setIsLoading(false)
    }
  }

  if (createdPacket) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold italic">Packet Created!</h1>
              <p className="text-black/50 text-sm mt-2">Share this code with others to claim</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-inner border-4 border-primary/10">
                <QRCodeSVG value={createdPacket.shareLink} size={180} level="H" />
              </div>
            </div>

            {/* Packet Code */}
            <div className="text-center">
              <p className="text-[10px] font-bold text-black/40 tracking-widest uppercase mb-2">Packet Code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold tracking-wider">{createdPacket.packetCode}</span>
                <button
                  onClick={() => handleCopy(createdPacket.packetCode)}
                  className="p-2 bg-muted rounded-xl hover:bg-primary/20 transition-all"
                >
                  {isCopied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Share Link */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-black/40 tracking-widest uppercase ml-2">Share Link</p>
              <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-2xl border border-black/5">
                <code className="flex-1 text-[10px] font-mono text-black/60 truncate">
                  {createdPacket.shareLink}
                </code>
                <button
                  onClick={() => handleCopy(createdPacket.shareLink)}
                  className="p-2 bg-white rounded-xl shadow-sm hover:bg-primary/20 transition-all"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleShare}
                className="w-full py-4 rounded-2xl bg-primary font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Share Packet
              </button>
              <button
                onClick={() => router.push("/home")}
                className="w-full py-4 rounded-2xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all"
              >
                Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-32">
      <Header />

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Balance Card */}
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 shadow-xl shadow-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-amber-900/60" />
            <p className="text-[10px] font-bold text-amber-900/60 tracking-widest uppercase">Saku Balance</p>
          </div>
          <p className="text-4xl font-bold text-black/85 tracking-tighter">{formattedBalance}</p>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold italic">Create Packet</h1>
          <p className="text-black/50 text-sm">Share a red envelope with anyone!</p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Packet Code */}
          <div className="space-y-2 px-2">
            <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2 uppercase italic">
              Packet Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={packetCode}
                onChange={(e) => setPacketCode(e.target.value.toUpperCase())}
                placeholder="Enter code or generate"
                maxLength={32}
                className="flex-1 bg-muted/50 rounded-2xl px-6 py-4 text-lg font-bold outline-none border-2 border-transparent focus:border-primary/50 transition-all uppercase"
              />
              <button
                onClick={handleGenerateCode}
                className="p-4 bg-muted rounded-2xl hover:bg-primary/20 transition-all"
              >
                <RefreshCw size={20} />
              </button>
            </div>
            <p className="text-[10px] text-black/30 ml-2">4-32 alphanumeric characters</p>
          </div>

          {/* Amount */}
          <div className="space-y-2 px-2">
            <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2 uppercase italic">
              Total Amount (IDRX)
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-black/20 text-xl">Rp</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-muted/50 rounded-[2rem] pl-16 pr-8 py-6 text-3xl font-bold outline-none border-2 border-transparent focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Max Winners */}
          <div className="space-y-2 px-2">
            <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2 uppercase italic flex items-center gap-1">
              <Users size={12} /> Max Winners
            </label>
            <input
              type="number"
              value={maxWinners}
              onChange={(e) => setMaxWinners(e.target.value)}
              min="1"
              max="500"
              className="w-full bg-muted/50 rounded-2xl px-6 py-4 text-lg font-bold outline-none border-2 border-transparent focus:border-primary/50 transition-all"
            />
            <p className="text-[10px] text-black/30 ml-2">1-500 people can claim</p>
          </div>

          {/* Distribution Type */}
          <div className="space-y-2 px-2">
            <label className="text-[10px] font-bold text-black/40 tracking-widest ml-2 uppercase italic">
              Distribution Type
            </label>
            <div className="flex p-1.5 bg-muted rounded-2xl border border-black/5">
              <button
                onClick={() => setDistributionType("RANDOM")}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  distributionType === "RANDOM"
                    ? "bg-white shadow-sm text-black"
                    : "text-muted-foreground hover:text-black/60"
                }`}
              >
                <Shuffle size={14} /> Random
              </button>
              <button
                onClick={() => setDistributionType("EQUAL")}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  distributionType === "EQUAL"
                    ? "bg-white shadow-sm text-black"
                    : "text-muted-foreground hover:text-black/60"
                }`}
              >
                <Divide size={14} /> Equal
              </button>
            </div>
            <p className="text-[10px] text-black/30 ml-2">
              {distributionType === "RANDOM"
                ? "Each claimer gets a random amount"
                : "Each claimer gets the same amount"}
            </p>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreatePacket}
            disabled={isLoading || !packetCode || !amount}
            className="w-full py-6 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Creating Packet...
              </>
            ) : (
              <>
                <Gift size={20} />
                Create Packet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

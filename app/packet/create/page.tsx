"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Gift, Loader2, Sparkles, Copy, Check, Share2,
  Users, Shuffle, Divide, Download, Home
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import Header from "@/components/layout/Header"
import { generatePacketCode } from "@/hooks/usePacket"

export default function CreatePacketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { formattedBalance } = useBalance(user?.wallet_address || null)
  const qrRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [maxWinners, setMaxWinners] = useState("10")
  const [distributionType, setDistributionType] = useState<"EQUAL" | "RANDOM">("RANDOM")
  const [createdPacket, setCreatedPacket] = useState<{
    packetCode: string
    shareLink: string
    transactionHash: string
  } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast.success("Link copied!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const downloadQRCode = () => {
    if (!qrRef.current) return
    
    const svg = qrRef.current.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width + 40 // Padding
      canvas.height = img.height + 120 // Space for text
      if (!ctx) return

      // Background
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw QR
      ctx.drawImage(img, 20, 20)

      // Add Text
      ctx.fillStyle = "black"
      ctx.font = "bold 20px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`Saku Packet: ${createdPacket?.packetCode}`, canvas.width / 2, img.height + 60)
      ctx.font = "14px sans-serif"
      ctx.fillText("Scan to claim your IDRX!", canvas.width / 2, img.height + 90)

      const pngFile = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.download = `Saku-Packet-${createdPacket?.packetCode}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  const handleCreatePacket = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setIsLoading(true)
    const autoGenCode = generatePacketCode(8) // Generate di belakang layar

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
          packetCode: autoGenCode,
          totalAmount: parseFloat(amount),
          maxWinners: parseInt(maxWinners),
          distributionType,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create packet")

      setCreatedPacket({
        packetCode: data.packetCode,
        shareLink: data.shareLink,
        transactionHash: data.transactionHash,
      })

      toast.success("Dana Kaget created!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (createdPacket) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500">
          <div className="w-full bg-white rounded-[3rem] p-8 shadow-2xl border border-black/5 space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold italic tracking-tight">Got Your Packet!</h1>
              <p className="text-black/40 text-sm italic">Share this QR or link to your friends</p>
            </div>

            {/* QR Section */}
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} className="p-4 bg-white rounded-3xl shadow-xl border border-black/5">
                <QRCodeSVG value={createdPacket.shareLink} size={200} level="H" />
              </div>
              
              <button 
                onClick={downloadQRCode}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-all"
              >
                <Download size={14} /> Download QR Image
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-[2rem] p-6 space-y-4">
               <div>
                  <p className="text-[10px] font-bold text-black/40 tracking-widest uppercase">Packet Code</p>
                  <p className="text-2xl font-black tracking-widest">{createdPacket.packetCode}</p>
               </div>
               <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-black/5">
                  <code className="flex-1 text-[10px] font-mono text-black/40 truncate">{createdPacket.shareLink}</code>
                  <button onClick={() => handleCopy(createdPacket.shareLink)} className="p-2">
                    {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
               <button 
                onClick={() => router.push("/home")}
                className="py-4 rounded-2xl bg-muted font-bold flex items-center justify-center gap-2 hover:bg-black/5 transition-all"
               >
                 <Home size={18} /> Home
               </button>
               <button 
                onClick={() => handleCopy(createdPacket.shareLink)}
                className="py-4 rounded-2xl bg-primary font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
               >
                 <Share2 size={18} /> Share Link
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
        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 shadow-xl shadow-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-amber-900/60" />
            <p className="text-[10px] font-bold text-amber-900/60 tracking-widest uppercase">Balance</p>
          </div>
          <p className="text-4xl font-bold text-black/85 tracking-tighter">{formattedBalance}</p>
        </div>

        <div className="space-y-8 pt-4">
          {/* Amount Input */}
          <div className="space-y-2 text-center">
            <label className="text-[10px] font-bold text-black/40 tracking-widest uppercase italic">Total Amount (IDRX)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-center text-6xl font-black outline-none placeholder:text-black/5"
            />
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-black/5 space-y-6">
            {/* Winners Count */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-black/40" />
                <span className="text-sm font-bold">Total Winners</span>
              </div>
              <input 
                type="number"
                value={maxWinners}
                onChange={(e) => setMaxWinners(e.target.value)}
                className="w-16 text-right font-black text-xl outline-none bg-transparent"
              />
            </div>

            {/* Distribution Selector */}
            <div className="flex p-1.5 bg-muted rounded-2xl">
              <button
                onClick={() => setDistributionType("RANDOM")}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  distributionType === "RANDOM" ? "bg-white shadow-sm text-black" : "text-black/30"
                }`}
              >
                <Shuffle size={14} /> Random
              </button>
              <button
                onClick={() => setDistributionType("EQUAL")}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  distributionType === "EQUAL" ? "bg-white shadow-sm text-black" : "text-black/30"
                }`}
              >
                <Divide size={14} /> Equal
              </button>
            </div>
          </div>

          <button
            onClick={handleCreatePacket}
            disabled={isLoading || !amount}
            className="w-full py-6 rounded-[2rem] bg-black text-white font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Gift size={20} />
                Create Dana Kaget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
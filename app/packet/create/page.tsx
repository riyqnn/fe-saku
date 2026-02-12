"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Gift, Loader2, Sparkles, Copy, Check, Share2,
  Users, Shuffle, Divide, Download, Home, X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { generatePacketCode } from "@/hooks/usePacket"
import { PacketTheme, PACKET_THEMES } from "@/lib/packet-themes"
import EnvelopeCarousel from "@/components/packet/envelope-carousel"

export default function CreatePacketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { formattedBalance } = useBalance(user?.wallet_address || null)
  const qrRef = useRef<HTMLDivElement>(null)

  const [selectedTheme, setSelectedTheme] = useState<PacketTheme | null>(null)
  const [currentDisplayTheme, setCurrentDisplayTheme] = useState<PacketTheme>(PACKET_THEMES[0])
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
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

  // Handle envelope click from carousel
  const handleEnvelopeClick = (theme: PacketTheme) => {
    setSelectedTheme(theme)
    setCurrentDisplayTheme(theme)
    setIsEnvelopeOpen(true)

    // Show form modal after envelope opens
    setTimeout(() => {
      setShowFormModal(true)
    }, 800)
  }

  // Handle theme change from carousel swipe
  const handleThemeChange = (theme: PacketTheme) => {
    if (!showFormModal) {
      setCurrentDisplayTheme(theme)
    }
  }

  // Close form modal
  const handleCloseForm = () => {
    setShowFormModal(false)
    setIsEnvelopeOpen(false)
    // Reset theme after a short delay to allow close animation
    setTimeout(() => {
      setSelectedTheme(null)
    }, 300)
  }

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
      canvas.width = img.width + 40
      canvas.height = img.height + 120
      if (!ctx) return

      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.drawImage(img, 20, 20)

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
    const autoGenCode = generatePacketCode(8)

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
          themeId: selectedTheme?.id || "blue",
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

  // Success Screen
  if (createdPacket) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans">
        <div className="p-4">
          <button
            onClick={() => router.push("/packet/create")}
            className="flex items-center gap-2 text-sm font-bold text-black/50 hover:text-black mb-4"
          >
            ← Create another packet
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500">
          <div className="w-full bg-white rounded-[3rem] p-8 shadow-2xl border border-black/5 space-y-6 text-center">
            <div className="space-y-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: (selectedTheme?.colors?.primary || "#1e88e5") as string || "#1e88e5" }}
              >
                <Gift className="w-8 h-8 text-white" />
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
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-all"
                style={{ color: (selectedTheme?.colors?.primary || "#1e88e5") as string || "#1e88e5" }}
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
                className="py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-white"
                style={{
                  backgroundColor: selectedTheme?.colors?.primary || "#1e88e5",
                  boxShadow: `0 10px 30px ${selectedTheme?.colors?.primary || "#1e88e5"}40`
                }}
               >
                 <Share2 size={18} /> Share Link
               </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main view: Carousel + Form that animates from envelope
  return (
    <>
      {/* Envelope Carousel - Full Screen */}
      <div className="fixed inset-0" style={{ background: currentDisplayTheme?.colors?.envelopeBg || "#42a5f5" }}>
        <EnvelopeCarousel
          onEnvelopeClick={handleEnvelopeClick}
          onThemeChange={handleThemeChange}
          isOpen={isEnvelopeOpen}
        />
      </div>

      {/* Form Modal - Animates from envelope center */}
      <AnimatePresence>
        {showFormModal && selectedTheme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="relative w-full max-w-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 300,
                delay: 0.3
              }}
              style={{
                originY: 0.5,
                originX: 0.5
              }}
            >
              {/* Form Card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-h-[85vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between rounded-t-[2.5rem]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: (selectedTheme?.colors?.primary || "#1e88e5") as string }}
                    >
                      <Gift size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold">{selectedTheme.name}</p>
                      <p className="text-xs text-black/50">Create your packet</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseForm}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-black/5 transition-all"
                  >
                    <X size={20} className="text-black/50" />
                  </button>
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-6">
                  {/* Balance Card - themed */}
                  <div
                    className="p-6 rounded-[2rem] shadow-lg"
                    style={{
                      backgroundColor: selectedTheme?.colors?.primary || "#1e88e5",
                      boxShadow: `0 10px 30px ${selectedTheme?.colors?.accent || "#1a9d7c"}40`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-white/80" />
                      <p className="text-[10px] font-bold text-white/80 tracking-widest uppercase">Balance</p>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tighter">{formattedBalance}</p>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2 text-center">
                    <label className="text-[10px] font-bold text-black/40 tracking-widest uppercase italic">Total Amount (IDRX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-center text-5xl font-black outline-none placeholder:text-black/5"
                    />
                  </div>

                  <div className="bg-muted/50 rounded-[2rem] p-5 space-y-5">
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
                    <div className="flex p-1.5 bg-white rounded-xl">
                      <button
                        onClick={() => setDistributionType("RANDOM")}
                        className={`flex-1 py-3 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                          distributionType === "RANDOM" ? "bg-black shadow-sm text-white" : "text-black/30"
                        }`}
                      >
                        <Shuffle size={14} /> Random
                      </button>
                      <button
                        onClick={() => setDistributionType("EQUAL")}
                        className={`flex-1 py-3 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                          distributionType === "EQUAL" ? "bg-black shadow-sm text-white" : "text-black/30"
                        }`}
                      >
                        <Divide size={14} /> Equal
                      </button>
                    </div>
                  </div>

                  {/* Create Button */}
                  <button
                    onClick={handleCreatePacket}
                    disabled={isLoading || !amount}
                    className="w-full py-5 rounded-[2rem] text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
                    style={{
                      backgroundColor: selectedTheme?.colors?.primary || "#1e88e5",
                      boxShadow: `0 15px 40px ${selectedTheme?.colors?.primary || "#1e88e5"}50`
                    }}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

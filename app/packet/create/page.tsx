"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Gift, Loader2, Sparkles, Copy, Check, Share2,
  Users, Shuffle, Divide, Download, Home, X, Wallet,
  ArrowRight, ExternalLink, ShieldCheck, Search
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { generatePacketCode } from "@/hooks/usePacket"
import { PacketTheme, PACKET_THEMES } from "@/lib/packet-themes"
import EnvelopeCarousel from "@/components/packet/envelope-carousel"
import Header from "@/components/layout/Header"
import { useContacts } from "@/hooks/useContacts"

export default function CreatePacketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { formattedBalance } = useBalance(user?.wallet_address || null)
  const qrRef = useRef<HTMLDivElement>(null)

  const [selectedTheme, setSelectedTheme] = useState<PacketTheme | null>(null)
  const [currentDisplayTheme, setCurrentDisplayTheme] = useState<PacketTheme>(PACKET_THEMES[0])
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [maxWinners, setMaxWinners] = useState("10")
  const [distributionType, setDistributionType] = useState<"EQUAL" | "RANDOM">("RANDOM")
  const [createdPacket, setCreatedPacket] = useState<{
    packetCode: string
    shareLink: string
    transactionHash: string
    totalAmount: string
  } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Fitur Private Circle
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchContact, setSearchContact] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
  const { contacts } = useContacts();

  const toggleContact = (contact: any) => {
    if (selectedContacts.find(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const handleThemeChange = (theme: PacketTheme) => {
    if (!showDrawer) setCurrentDisplayTheme(theme)
  }

  const handleEnvelopeClick = (theme: PacketTheme) => {
    setSelectedTheme(theme)
    setCurrentDisplayTheme(theme)
    setIsEnvelopeOpen(true)
    setTimeout(() => setShowDrawer(true), 800)
  }

  const handleCloseDrawer = () => {
    setShowDrawer(false)
    setIsEnvelopeOpen(false)
    setTimeout(() => setSelectedTheme(null), 300)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast.success("Copied to clipboard!")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleCreatePacket = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    
    if (isPrivate && selectedContacts.length === 0) {
      toast.error("Please select at least one contact for Private Circle")
      return
    }

    setIsLoading(true)
    const autoGenCode = generatePacketCode(8)

    try {
      const token = localStorage.getItem("saku_auth_token")
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
          themeId: selectedTheme?.id || "orange",
          targetPhones: isPrivate ? selectedContacts.map(c => c.phone_number) : null
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create")

      setCreatedPacket({
        packetCode: data.packetCode,
        shareLink: data.shareLink,
        transactionHash: data.transactionHash,
        totalAmount: amount
      })
      toast.success("Transaction Confirmed!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (createdPacket) {
    // ... UI Success Lu (Tetap sama)
    return (
        <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans relative overflow-hidden">
          <Header title="Receipt" showBack={false} />
          
          {/* Animated Background Mesh for Success */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="absolute top-[20%] right-[-10%] w-[250px] h-[250px] bg-green-500/5 blur-[100px] rounded-full" />
          </div>
  
          <div className="flex-1 flex flex-col items-center p-6 space-y-6 relative z-10 animate-slide-in">
            {/* Main Success Card */}
            <div className="w-full bg-white rounded-[2.5rem] shadow-2xl border border-border overflow-hidden">
              <div className="p-8 text-center space-y-6">
                {/* Wallet Icon with Success Badge */}
                <div className="relative w-24 h-24 mx-auto">
                  <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet size={48} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg border-4 border-white">
                    <ShieldCheck size={20} />
                  </div>
                </div>
  
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Payment Sent</p>
                  <h1 className="text-4xl font-black text-foreground tracking-tighter">
                    {createdPacket.totalAmount} <span className="text-primary/60">USDC</span>
                  </h1>
                </div>
  
                {/* Transaction Detail Box */}
                <div className="bg-muted/30 rounded-[2rem] p-6 space-y-4 border border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Status</span>
                    <span className="text-green-600 font-black flex items-center gap-1 uppercase text-[10px] tracking-widest">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Confirmed
                    </span>
                  </div>
                  <div className="h-px bg-border/50 w-full" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Distribution</span>
                    <span className="font-bold text-foreground capitalize">{distributionType.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Recipients</span>
                    <span className="font-bold text-foreground">{maxWinners} People</span>
                  </div>
                </div>
  
                {/* Shareable QR Section */}
                <div className="space-y-4 pt-4">
                  <div className="relative group inline-block">
                    <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div ref={qrRef} className="relative p-5 bg-white rounded-[2.5rem] shadow-xl border border-border inline-block">
                      <QRCodeSVG value={createdPacket.shareLink} size={160} level="H" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1">Packet Code: <span className="text-primary font-black uppercase">{createdPacket.packetCode}</span></p>
                    <p className="text-[10px] text-muted-foreground px-10">Anyone with this QR or code can claim the rewards in your packet.</p>
                  </div>
                </div>
              </div>
  
              {/* Bottom Action Bar */}
              <div className="bg-muted/20 p-6 grid grid-cols-2 gap-3 border-t border-border">
                 <button 
                  onClick={() => router.push("/home")} 
                  className="py-4 rounded-2xl bg-white border border-border font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Home size={18} /> Home
                 </button>
                 <button 
                  onClick={() => handleCopy(createdPacket.shareLink)} 
                  className="py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Share2 size={18} /> {isCopied ? 'Copied' : 'Share Link'}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-border relative overflow-hidden">
      <Header title="Create Packet" />
      
      {/* Premium Mesh Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] right-[-10%] w-[350px] h-[350px] bg-primary/15 blur-[100px] rounded-full" 
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[15%] left-[-15%] w-[300px] h-[300px] bg-saku-yellow/10 blur-[90px] rounded-full" 
        />
      </div>

      <div className="flex-1 relative z-10 flex flex-col">
        <EnvelopeCarousel
          onEnvelopeClick={handleEnvelopeClick}
          onThemeChange={handleThemeChange}
          isOpen={isEnvelopeOpen}
        />
      </div>

      <AnimatePresence>
        {showDrawer && selectedTheme && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-white rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.2)] border-t border-border"
            >
              <div className="p-6 pb-12">
                <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 shadow-inner" />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <Gift size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight">{selectedTheme.name} Packet</h3>
                      <p className="text-xs text-muted-foreground font-medium">Configure your USDC distribution</p>
                    </div>
                  </div>
                  <button onClick={handleCloseDrawer} className="p-2.5 bg-muted rounded-full active:scale-90 transition-all">
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Glassmorphism Balance Chip */}
                  <div className="flex items-center justify-between px-6 py-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Balance</span>
                    </div>
                    <span className="text-sm font-black text-foreground">{formattedBalance} USDC</span>
                  </div>

                  {/* High Precision Input */}
                  <div className="text-center space-y-2 py-6">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em]">Total USDC Amount</label>
                    <div className="flex items-center justify-center gap-3">
                      <input
                        type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-[70%] bg-transparent text-center text-7xl font-black outline-none placeholder:text-muted/10 tracking-tighter"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 bg-muted/30 p-2 rounded-[2.5rem] border border-border">
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Users size={20} className="text-muted-foreground" />
                        <span className="font-bold text-sm">Total Winners</span>
                      </div>
                      <input 
                        type="number" value={maxWinners} onChange={(e) => setMaxWinners(e.target.value)}
                        className="w-12 text-right font-black text-xl bg-transparent outline-none text-primary"
                      />
                    </div>
                    
                    <div className="flex p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-border shadow-inner">
                      <button
                        onClick={() => setDistributionType("RANDOM")}
                        className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          distributionType === "RANDOM" ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" : "text-muted-foreground"
                        }`}
                      >
                        <Shuffle size={14} /> Random
                      </button>
                      <button
                        onClick={() => setDistributionType("EQUAL")}
                        className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          distributionType === "EQUAL" ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" : "text-muted-foreground"
                        }`}
                      >
                        <Divide size={14} /> Equal
                      </button>
                    </div>
                  </div>

                  {/* --- TARO DISINI CU (PRIVATE CIRCLE SECTION) --- */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                        <div className="flex items-center gap-3">
                            <Users size={20} className="text-primary" />
                            <div>
                            <p className="text-sm font-bold">Private Circle</p>
                            <p className="text-[10px] text-muted-foreground">Only selected friends can claim</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsPrivate(!isPrivate)}
                            className={`w-12 h-6 rounded-full transition-all relative ${isPrivate ? 'bg-primary' : 'bg-muted'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPrivate ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <AnimatePresence>
                    {isPrivate && (
                        <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 overflow-hidden"
                        >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input 
                            type="text" 
                            placeholder="Search friends..."
                            value={searchContact}
                            onChange={(e) => setSearchContact(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-xl text-xs outline-none focus:ring-1 ring-primary"
                            />
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                            {contacts?.filter(c => c.name.toLowerCase().includes(searchContact.toLowerCase())).map(contact => (
                            <button 
                                key={contact.id}
                                onClick={() => toggleContact(contact)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                selectedContacts.find(c => c.id === contact.id) ? 'border-primary bg-primary/5' : 'border-border bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                    {contact.name[0]}
                                </div>
                                <p className="text-xs font-bold">{contact.name}</p>
                                </div>
                                {selectedContacts.find(c => c.id === contact.id) && <Check size={14} className="text-primary" />}
                            </button>
                            ))}
                        </div>
                        
                        <p className="text-[10px] text-center text-muted-foreground font-medium italic">
                            Tip: Select more people than winners for a "Fastest Finger" challenge!
                        </p>
                        </motion.div>
                    )}
                    </AnimatePresence>
                  </div>

                  {/* --- CREATE BUTTON --- */}
                  <button
                    onClick={handleCreatePacket}
                    disabled={isLoading || !amount}
                    className="w-full py-6 rounded-[2rem] bg-primary text-primary-foreground font-black text-xl shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 transition-all mt-4 group"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <span>Blast USDC Packet</span>
                        <Gift size={22} className="group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
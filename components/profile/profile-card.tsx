"use client"

import { useEffect, useState } from "react"
import { Copy, Check } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function ProfileCard() {
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [registrationDate, setRegistrationDate] = useState<string | null>(null)

  useEffect(() => {
    const wallet = localStorage.getItem('walletAddress')
    const phone = localStorage.getItem('phoneNumber')
    const timestamp = localStorage.getItem('walletCreatedAt')
    
    setWalletAddress(wallet)
    setPhoneNumber(phone)
    
    if (timestamp) {
      const date = new Date(parseInt(timestamp))
      setRegistrationDate(date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }))
    }
  }, [])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 p-6 sm:p-8 space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground">Account Active</span>
        </div>

        {/* Wallet Address */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">WALLET ADDRESS</p>
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
            <p className="font-mono text-sm font-semibold">
              {walletAddress ? formatAddress(walletAddress) : 'Loading...'}
            </p>
            <button
              onClick={() => walletAddress && copyToClipboard(walletAddress, 'wallet')}
              className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
            >
              {copiedField === 'wallet' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">PHONE NUMBER</p>
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
            <p className="font-mono text-sm font-semibold">
              {phoneNumber ? phoneNumber.slice(-4) : 'Loading...'}
            </p>
            <button
              onClick={() => phoneNumber && copyToClipboard(phoneNumber, 'phone')}
              className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
            >
              {copiedField === 'phone' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Registration Date */}
        {registrationDate && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">REGISTERED ON</p>
            <p className="text-sm font-medium text-foreground">{registrationDate}</p>
          </div>
        )}

        {/* Status Info */}
        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">On-chain Status</span>
            <span className="text-xs font-semibold text-green-500">✓ Registered</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Wallet Type</span>
            <span className="text-xs font-semibold">Personal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

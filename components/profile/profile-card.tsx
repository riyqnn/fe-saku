"use client"

import { useEffect, useState } from "react"
import { Copy, CheckCircle, Shield, Smartphone } from "lucide-react"
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
    <div className="rounded-3xl sm:rounded-4xl overflow-hidden border border-border/50 bg-gradient-to-br from-primary/10 via-card to-accent/5 dark:from-primary/5 dark:via-card/50 dark:to-accent/5 shadow-lg">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 dark:from-primary/10 dark:to-accent/10 px-6 sm:px-8 py-6 sm:py-8 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full opacity-20 animate-ping" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Account Active</span>
          </div>
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>

        {/* User Greeting */}
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Welcome</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{phoneNumber || 'User'}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* Wallet Address */}
        <div className="space-y-2.5">
          <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Wallet Address</p>
          <button
            onClick={() => walletAddress && copyToClipboard(walletAddress, 'wallet')}
            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-muted/50 dark:bg-muted/20 hover:bg-muted/80 dark:hover:bg-muted/40 border border-border/50 transition-all duration-200 group"
          >
            <p className="font-mono text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {walletAddress ? formatAddress(walletAddress) : 'Loading...'}
            </p>
            {copiedField === 'wallet' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 ml-2" />
            ) : (
              <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
            )}
          </button>
        </div>

        {/* Phone Number */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Phone</p>
            <Smartphone className="w-4 h-4 text-primary" />
          </div>
          <button
            onClick={() => phoneNumber && copyToClipboard(phoneNumber, 'phone')}
            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-muted/50 dark:bg-muted/20 hover:bg-muted/80 dark:hover:bg-muted/40 border border-border/50 transition-all duration-200 group"
          >
            <p className="font-mono text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {phoneNumber ? phoneNumber : 'Loading...'}
            </p>
            {copiedField === 'phone' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 ml-2" />
            ) : (
              <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
            )}
          </button>
        </div>

        {/* Registration Date */}
        {registrationDate && (
          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Member Since</p>
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/50 dark:bg-muted/20 border border-border/50">
              <p className="text-sm sm:text-base font-semibold text-foreground">{registrationDate}</p>
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="pt-2 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">On-chain Status</span>
            <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full">✓ Verified</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">Account Type</span>
            <span className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">Personal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

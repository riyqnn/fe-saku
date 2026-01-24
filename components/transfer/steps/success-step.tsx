"use client"

import { useEffect, useState } from "react"
import { CheckCircle, ExternalLink, Copy, Check, UserPlus } from "lucide-react"
import { useContacts } from "@/hooks/useContacts"

interface SuccessStepProps {
  txHash: string | null
  receiverName: string
  receiverPhone: string
  amount: string
  onComplete: () => void
}

export default function SuccessStep({ txHash, receiverName, receiverPhone, amount, onComplete }: SuccessStepProps) {
  const [showAnimation, setShowAnimation] = useState(true)
  const [copied, setCopied] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)

  const { contacts, addContact } = useContacts()

  // Check if receiver is already in contacts
  const isAlreadyContact = contacts.some(
    (c) => c.phone_number === receiverPhone
  )

  const shouldShowSaveButton = !isAlreadyContact && !contactSaved && receiverPhone && receiverName !== receiverPhone

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleCopy = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveContact = async () => {
    try {
      setSavingContact(true)
      const result = await addContact({
        name: receiverName,
        phone_number: receiverPhone,
      })

      if (result.success) {
        setContactSaved(true)
      }
    } catch (err) {
      console.error("Failed to save contact:", err)
    } finally {
      setSavingContact(false)
    }
  }

  const getExplorerUrl = () => {
    if (!txHash) return "#"
    // Base Sepolia testnet
    return `https://sepolia.basescan.org/tx/${txHash}`
  }

  return (
    <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 text-center animate-fade-in-scale">
      {/* Success Icon & Animation */}
      <div className="py-4 sm:py-6">
        {showAnimation ? (
          <>
            {/* Confetti particles */}
            <div className="relative h-32 sm:h-40 flex items-center justify-center">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-br from-primary to-accent rounded-full animate-confetti"
                  style={{
                    left: `${20 + (i % 3) * 20}%`,
                    top: `${10 + (Math.floor(i / 3) * 20)}%`,
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: `${1.5 + (i % 3) * 0.3}s`,
                  }}
                />
              ))}
              <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 text-green-500 dark:text-green-400 animate-pulse-scale" />
            </div>
          </>
        ) : (
          <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 text-green-500 dark:text-green-400 mx-auto" />
        )}
      </div>

      {/* Success Message */}
      <div className="space-y-2.5 sm:space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Transfer Successful!</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {Number(amount).toLocaleString()} IDRX sent to {receiverName}
        </p>
      </div>

      {/* Save Contact Button */}
      {shouldShowSaveButton && (
        <button
          onClick={handleSaveContact}
          disabled={savingContact}
          className="w-full py-3 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {savingContact ? "Saving..." : `Save ${receiverName} as Contact`}
        </button>
      )}

      {contactSaved && (
        <div className="w-full py-3 px-6 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm font-semibold text-green-500 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            Contact saved successfully!
          </p>
        </div>
      )}

      {/* Transaction Details */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-primary/20 space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Transaction Hash</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs sm:text-sm font-semibold text-foreground break-all flex-1 text-left">
              {txHash || "Processing..."}
            </p>
            {txHash && (
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                title="Copy hash"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>
        {txHash && (
          <a
            href={getExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary hover:text-accent transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </a>
        )}
      </div>

      {/* Info Alert */}
      <div className="bg-green-100 dark:bg-green-900/30 rounded-2xl p-4 sm:p-5 border border-green-200 dark:border-green-800">
        <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-300">
          ✓ Your wallet balance will update in a few moments
        </p>
      </div>

      {/* Complete Button */}
      <button
        onClick={onComplete}
        className="btn-primary w-full text-base sm:text-lg font-bold py-3 sm:py-4"
      >
        Done
      </button>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { CheckCircle, ExternalLink, Copy, Check } from "lucide-react"

export default function SuccessStep({ txHash, onComplete }: { txHash: string | null; onComplete: () => void }) {
  const [showAnimation, setShowAnimation] = useState(true)
  const [copied, setCopied] = useState(false)

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
          Money has been sent successfully on the blockchain
        </p>
      </div>

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

"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useWallet } from "@/hooks/useWallet"
import { useRegistry } from "@/hooks/useRegistry"
import { useIDRX } from "@/hooks/useIDRX"
import { toTokenAmount } from "@/lib/blockchain"
import { IDRX_DECIMALS } from "@/lib/config"
import ReceiverStep from "./steps/receiver-step"
import AmountStep from "./steps/amount-step"
import ReviewStep from "./steps/review-step"
import SuccessStep from "./steps/success-step"

export default function TransferModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { signer } = useWallet()
  const { transferByPhone } = useRegistry(signer)
  const { approveUnlimited, allowance } = useIDRX(signer, user ? localStorage.getItem('walletAddress') || null : null)

  const [step, setStep] = useState<"receiver" | "amount" | "review" | "success">("receiver")
  const [receiver, setReceiver] = useState<{ name: string; phone: string } | null>(null)
  const [amount, setAmount] = useState("")
  const [isApproved, setIsApproved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleReceiverSelect = (name: string, phone: string) => {
    setReceiver({ name, phone })
    setStep("amount")
  }

  const handleAmountSubmit = async (amt: string) => {
    setAmount(amt)

    // Check allowance
    if (signer && receiver) {
      try {
        const amountBigInt = toTokenAmount(parseFloat(amt), IDRX_DECIMALS)
        if (amountBigInt > 0n && allowance >= amountBigInt) {
          setIsApproved(true)
        }
      } catch (err) {
        console.error('Error checking allowance:', err)
      }
    }

    setStep("review")
  }

  const handleApprove = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!signer) {
        throw new Error("Wallet not connected")
      }

      await approveUnlimited()
      setIsApproved(true)
    } catch (err: any) {
      setError(err.message || "Failed to approve tokens")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!receiver || !user?.phone || !signer) {
        throw new Error("Missing required information")
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount")
      }

      if (!isApproved) {
        throw new Error("Please approve the contract first")
      }

      const amountBigInt = toTokenAmount(parseFloat(amount), IDRX_DECIMALS)
      const receipt = await transferByPhone(receiver.phone, amountBigInt)

      setTxHash(receipt.hash)
      setStep("success")
    } catch (err: any) {
      setError(err.message || "Transfer failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    onClose()
  }

  // Progress indicator
  const steps = ["receiver", "amount", "review", "success"]
  const currentStepIndex = steps.indexOf(step)

  return (
    <div className="w-full rounded-3xl sm:rounded-4xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 sm:h-1.5 bg-muted/50 dark:bg-muted/20 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="animate-fade-in-up">
        {step === "receiver" && <ReceiverStep onSelect={handleReceiverSelect} onClose={onClose} />}
        {step === "amount" && (
          <AmountStep receiver={receiver!} onSubmit={handleAmountSubmit} onBack={() => setStep("receiver")} />
        )}
        {step === "review" && (
          <ReviewStep
            receiver={receiver!}
            amount={Number.parseInt(amount)}
            isApproved={isApproved}
            isLoading={isLoading}
            onApprove={handleApprove}
            onConfirm={handleConfirm}
            onBack={() => setStep("amount")}
          />
        )}
        {step === "success" && <SuccessStep txHash={txHash} onComplete={handleComplete} />}
      </div>
    </div>
  )
}

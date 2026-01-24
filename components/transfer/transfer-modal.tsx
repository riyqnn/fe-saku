"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useSakuTransfer } from "@/hooks/useSakuTransfer"
import { useBalance } from "@/hooks/useBalance"
import { eventBus, EVENTS } from "@/lib/events"
import ReceiverStep from "./steps/receiver-step"
import AmountStep from "./steps/amount-step"
import ReviewStep from "./steps/review-step"
import SuccessStep from "./steps/success-step"

export default function TransferModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const walletAddress = user?.wallet_address || null
  const { transferByPhone, loading } = useSakuTransfer()
  const { refetch: refetchBalance } = useBalance(walletAddress)

  const [step, setStep] = useState<"receiver" | "amount" | "review" | "success">("receiver")
  const [receiver, setReceiver] = useState<{ name: string; phone: string } | null>(null)
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const normalizePhone = (phone: string) => {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    return normalized;
  }

  const handleReceiverSelect = (name: string, phone: string) => {
    setReceiver({ name, phone: normalizePhone(phone) })
    setStep("amount")
  }

  const handleAmountSubmit = (amt: string) => {
    setAmount(amt)
    setStep("review")
  }

  const handleConfirm = async () => {
    try {
      setError(null)

      if (!receiver || !user?.phone_number) {
        throw new Error("Missing required information. Please re-login.")
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount")
      }

      const result = await transferByPhone({
        senderPhone: normalizePhone(user.phone_number), // Tambahkan parameter senderPhone jika hook membutuhkannya
        receiverPhone: receiver.phone, // Sudah dinormalisasi di handleReceiverSelect
        amount: amount,
      })

      if (result.success) {
        setTxHash(result.transactionHash || null)

        // Emit global balance refresh event for all components
        eventBus.emit(EVENTS.BALANCE_REFRESH)

        // Also refetch local balance for this modal instance
        await refetchBalance()
        setStep("success")
      } else {
        throw new Error(result.error || "Transfer failed")
      }
    } catch (err: any) {
      setError(err.message || "Transfer failed")
    }
  }

  const handleComplete = () => {
    onClose()
  }

  // Progress indicator logic
  const steps = ["receiver", "amount", "review", "success"]
  const currentStepIndex = steps.indexOf(step)

  return (
    <div className="w-full rounded-3xl sm:rounded-4xl overflow-hidden bg-background">
      {/* Progress bar */}
      <div className="h-1 sm:h-1.5 bg-muted/50 dark:bg-muted/20 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20 animate-in fade-in slide-in-from-top-1">
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
            isLoading={loading}
            onConfirm={handleConfirm}
            onBack={() => setStep("amount")}
          />
        )}
        {step === "success" && (
          <SuccessStep
            txHash={txHash}
            receiverName={receiver?.name || ""}
            receiverPhone={receiver?.phone || ""}
            amount={amount}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  )
}
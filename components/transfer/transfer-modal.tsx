"use client"

import { useState } from "react"
import ReceiverStep from "./steps/receiver-step"
import AmountStep from "./steps/amount-step"
import ReviewStep from "./steps/review-step"
import SuccessStep from "./steps/success-step"

export default function TransferModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"receiver" | "amount" | "review" | "success">("receiver")
  const [receiver, setReceiver] = useState<{ name: string; phone: string } | null>(null)
  const [amount, setAmount] = useState("")

  const handleReceiverSelect = (name: string, phone: string) => {
    setReceiver({ name, phone })
    setStep("amount")
  }

  const handleAmountSubmit = (amt: string) => {
    setAmount(amt)
    setStep("review")
  }

  const handleConfirm = () => {
    setStep("success")
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
            onConfirm={handleConfirm}
            onBack={() => setStep("amount")}
          />
        )}
        {step === "success" && <SuccessStep onComplete={handleComplete} />}
      </div>
    </div>
  )
}

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-background w-full rounded-t-2xl animate-slide-in">
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

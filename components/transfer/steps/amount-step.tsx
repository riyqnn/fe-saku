"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"

export default function AmountStep({
  receiver,
  onSubmit,
  onBack,
}: {
  receiver: { name: string; phone: string }
  onSubmit: (amount: string) => void
  onBack: () => void
}) {
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  const handleSubmit = () => {
    if (amount && Number.parseInt(amount) > 0) {
      onSubmit(amount)
    }
  }

  const quickAmounts = [10000, 25000, 50000, 100000]

  return (
    <div className="p-5 sm:p-7 space-y-6 sm:space-y-8">
      {/* Back Button & Receiver Info */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Sending to</p>
          <p className="font-bold text-sm sm:text-base text-foreground truncate">{receiver.name}</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2.5 sm:space-y-3">
        <label className="block text-sm sm:text-base font-bold text-foreground uppercase tracking-widest">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Rp 0"
          className="input-modern w-full text-lg sm:text-xl font-bold"
          autoFocus
        />
      </div>

      {/* Quick Amounts */}
      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">Popular Amounts</p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {quickAmounts.map((qAmount) => (
            <button
              key={qAmount}
              onClick={() => setAmount(qAmount.toString())}
              className="px-4 sm:px-5 py-3 sm:py-4 bg-secondary/30 dark:bg-secondary/10 hover:bg-secondary/50 dark:hover:bg-secondary/20 border border-secondary/20 rounded-2xl text-sm sm:text-base font-bold text-secondary-foreground transition-all duration-200 active:scale-95"
            >
              Rp {qAmount.toLocaleString("id-ID")}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2.5 sm:space-y-3">
        <label className="block text-xs sm:text-sm font-bold text-foreground uppercase tracking-widest">
          Note <span className="font-normal text-muted-foreground text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Lunch payment"
          className="input-modern w-full"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!amount || Number.parseInt(amount) <= 0}
        className="btn-primary w-full text-base sm:text-lg font-bold py-3 sm:py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  )
}

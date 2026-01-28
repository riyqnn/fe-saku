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
    <div className="p-5 sm:p-7 space-y-6 sm:space-y-8 font-sans">
      {/* Back Button & Receiver Info */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-black/40 hover:text-black/85 transition-colors" />
        </button>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-black/50 font-medium">Sending to</p>
          <p className="font-bold text-sm sm:text-base text-black/85 truncate">{receiver.name}</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2.5 sm:space-y-3">
        <label className="block text-sm sm:text-base font-bold text-black/85 uppercase tracking-widest">Amount</label>
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
        <p className="text-xs sm:text-sm font-bold text-black/85 uppercase tracking-widest">Popular Amounts</p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {quickAmounts.map((qAmount) => (
            <button
              key={qAmount}
              onClick={() => setAmount(qAmount.toString())}
              className="px-4 sm:px-5 py-3 sm:py-4 bg-muted/50 hover:bg-primary/20 border border-black/5 rounded-2xl text-sm sm:text-base font-bold text-black/85 transition-all duration-200 active:scale-95"
            >
              Rp {qAmount.toLocaleString("id-ID")}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2.5 sm:space-y-3">
        <label className="block text-xs sm:text-sm font-bold text-black/85 uppercase tracking-widest">
          Note <span className="font-normal text-black/40 text-xs">(Optional)</span>
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
        className="w-full py-4 rounded-2xl bg-black text-white font-bold text-base sm:text-lg shadow-xl shadow-black/10 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  )
}
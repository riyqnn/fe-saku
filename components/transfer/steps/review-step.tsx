"use client"

import { ArrowLeft, Check, AlertCircle } from "lucide-react"

export default function ReviewStep({
  receiver,
  amount,
  isLoading,
  onConfirm,
  onBack,
}: {
  receiver: { name: string; phone: string }
  amount: number
  isLoading: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)

  return (
    <div className="p-5 sm:p-7 space-y-6 sm:space-y-8">
      {/* Back Button */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Review Transfer</h2>
      </div>

      {/* Transfer Details Card */}
      <div className="card-elevated space-y-4 sm:space-y-5 p-5 sm:p-6">
        {/* Receiver */}
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">To</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
              {receiver.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm sm:text-base text-foreground truncate">{receiver.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{receiver.phone}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Amount */}
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Amount</p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground">{formattedAmount}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Fee */}
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Fee</p>
          <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">Free</p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="flex gap-3 p-4 sm:p-5 rounded-2xl bg-accent/10 dark:bg-accent/5 border border-accent/20">
        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm font-medium text-accent leading-relaxed">
          Transfer will be processed instantly on the blockchain. Server will handle token approval automatically.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-col gap-3 sm:gap-4">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="btn-primary w-full text-base sm:text-lg font-bold py-3 sm:py-4 flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : (
            <>
              <Check className="w-5 h-5 sm:w-6 sm:h-6" />
              Send Transfer
            </>
          )}
        </button>

        <button
          onClick={onBack}
          disabled={isLoading}
          className="btn-outline w-full text-sm sm:text-base font-bold py-2.5 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
      </div>
    </div>
  )
}

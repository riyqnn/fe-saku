"use client"

import { ArrowLeft, Check, ShieldCheck, Zap, Info } from "lucide-react"

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
  // Formatted for USDC
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount)

  return (
    <div className="flex flex-col h-full bg-white font-sans animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 rounded-full transition-all duration-200 group disabled:opacity-30"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Transfer</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Double check your transaction details</p>
          </div>
        </div>

        {/* Transfer Details Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6">
          {/* Receiver Info */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Recipient</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-slate-200">
                {receiver.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base text-slate-900 truncate">{receiver.name}</p>
                <p className="text-xs text-slate-500 font-medium">{receiver.phone}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200/60" />

          {/* Amount Display */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">Total Amount</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{formattedAmount}</span>
              <span className="text-lg font-bold text-slate-400 uppercase">USDC</span>
            </div>
          </div>

          <div className="h-px bg-slate-200/60" />

          {/* Fee & Speed */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Transaction Fee</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">FREE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Estimated Speed</span>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                <Zap className="w-3 h-3 text-secondary fill-secondary" />
                <span>Instant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Blockchain Info */}
        <div className="mt-6 flex gap-3 p-4 rounded-2xl bg-secondary/5 border border-secondary/10">
          <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
            Your transfer will be secured via blockchain. Saku handles the gas fees and token approval automatically for a seamless experience.
          </p>
        </div>
      </div>

      {/* Action Area */}
      <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-100 rounded-b-3xl">
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-secondary text-white font-bold text-sm shadow-xl shadow-slate-200 flex items-center justify-center gap-3 hover:bg-primary active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirm & Send Transfer
              </>
            )}
          </button>
          
          <button
            onClick={onBack}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-500 font-bold text-sm hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-0"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
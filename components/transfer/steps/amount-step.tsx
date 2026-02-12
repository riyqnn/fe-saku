"use client"

import { useState } from "react"
import { ArrowLeft, Wallet, Info } from "lucide-react"

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
    if (amount && Number.parseFloat(amount) > 0) {
      onSubmit(amount)
    }
  }

  const quickAmounts = [5, 10, 25, 50]

  return (
    <div className="flex flex-col h-full bg-white font-sans animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-all duration-200 group"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              {receiver.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Sending to</p>
              <p className="font-bold text-sm text-slate-900 truncate">{receiver.name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="relative group">
            <div className="flex justify-between items-end mb-3 px-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Enter Amount</label>
              <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                <Wallet className="w-3 h-3" /> USDC Available
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 px-6 text-3xl font-black text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none placeholder:text-slate-200"
                autoFocus
              />
              <div className="absolute right-6 flex items-center gap-2 pointer-events-none">
                <span className="font-black text-lg text-slate-400">USDC</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-1">Quick Selection</p>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((qAmount) => (
                <button
                  key={qAmount}
                  onClick={() => setAmount(qAmount.toString())}
                  className="py-3 bg-white border border-slate-100 hover:border-primary/50 hover:bg-primary/[0.02] rounded-2xl text-xs font-bold text-slate-600 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  ${qAmount}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-1">
              Note <span className="lowercase opacity-60 font-medium">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-100 rounded-b-3xl space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">Network Fee</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600">Free</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!amount || Number.parseFloat(amount) <= 0}
          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale"
        >
          Continue to Review
        </button>
      </div>
    </div>
  )
}
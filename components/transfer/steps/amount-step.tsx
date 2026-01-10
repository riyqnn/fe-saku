"use client"

import { useState } from "react"

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

  const handleSubmit = () => {
    if (amount && Number.parseInt(amount) > 0) {
      onSubmit(amount)
    }
  }

  const quickAmounts = [10000, 25000, 50000, 100000]

  return (
    <div className="p-4 space-y-6 animate-slide-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-2xl text-muted-foreground hover:text-foreground">
          ←
        </button>
        <div>
          <p className="text-sm text-muted-foreground">Kirim ke</p>
          <p className="font-bold text-foreground">{receiver.name}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Nominal</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Rp 0"
          className="w-full px-4 py-3 bg-input border border-border rounded-lg text-lg font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Nominal Populer</p>
        <div className="grid grid-cols-2 gap-2">
          {quickAmounts.map((qAmount) => (
            <button
              key={qAmount}
              onClick={() => setAmount(qAmount.toString())}
              className="px-3 py-2 bg-secondary rounded-lg text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Rp {qAmount.toLocaleString("id-ID")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Catatan (opsional)</label>
        <input
          type="text"
          placeholder="Misal: Patungan makan"
          className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!amount || Number.parseInt(amount) <= 0}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Lanjut
      </button>
    </div>
  )
}

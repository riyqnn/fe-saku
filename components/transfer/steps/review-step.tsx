"use client"

export default function ReviewStep({
  receiver,
  amount,
  onConfirm,
  onBack,
}: {
  receiver: { name: string; phone: string }
  amount: number
  onConfirm: () => void
  onBack: () => void
}) {
  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)

  return (
    <div className="p-4 space-y-6 animate-slide-in">
      <h2 className="text-xl font-bold text-foreground">Periksa Detail</h2>

      <div className="bg-card rounded-lg p-4 border border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Penerima</span>
          <div className="text-right">
            <p className="font-semibold text-foreground">{receiver.name}</p>
            <p className="text-xs text-muted-foreground">{receiver.phone}</p>
          </div>
        </div>

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <span className="text-muted-foreground">Nominal</span>
          <p className="text-2xl font-bold text-foreground">{formattedAmount}</p>
        </div>

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <span className="text-muted-foreground">Biaya</span>
          <p className="text-sm text-accent">Gratis</p>
        </div>
      </div>

      <div className="bg-primary/5 rounded-lg p-3 text-sm text-foreground">
        ✓ Transaksi akan diproses secara instan. Gas fee ditanggung sponsor.
      </div>

      <button
        onClick={onConfirm}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors animate-pulse-scale"
      >
        Bayar Sekarang
      </button>

      <button
        onClick={onBack}
        className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
      >
        Kembali
      </button>
    </div>
  )
}

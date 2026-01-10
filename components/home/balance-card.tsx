"use client"

export default function BalanceCard({ balance }: { balance: number }) {
  const formattedBalance = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(balance)

  return (
    <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-6 text-primary-foreground shadow-lg animate-slide-in">
      <p className="text-sm opacity-80 mb-2">Saldo Anda</p>
      <h2 className="text-4xl font-bold">{formattedBalance}</h2>
      <p className="text-xs opacity-60 mt-4">IDRX • Smart Account</p>
    </div>
  )
}

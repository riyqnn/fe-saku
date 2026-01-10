"use client"

export default function RecentTransfers() {
  const transfers = [
    { name: "Budi", phone: "+62812xxxxxx", amount: -50000, time: "Kemarin" },
    { name: "Siti", phone: "+62812xxxxxx", amount: 100000, time: "2 hari lalu" },
    { name: "Ahmad", phone: "+62812xxxxxx", amount: -30000, time: "3 hari lalu" },
  ]

  return (
    <div className="space-y-3 animate-slide-in">
      <h3 className="font-semibold text-foreground">Transaksi Terbaru</h3>
      <div className="space-y-2">
        {transfers.map((transfer, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">{transfer.name[0]}</span>
              </div>
              <div>
                <p className="font-medium text-foreground">{transfer.name}</p>
                <p className="text-xs text-muted-foreground">{transfer.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${transfer.amount < 0 ? "text-foreground" : "text-accent"}`}>
                {transfer.amount < 0 ? "-" : "+"}Rp {Math.abs(transfer.amount).toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-muted-foreground">{transfer.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

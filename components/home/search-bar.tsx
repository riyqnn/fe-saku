"use client"

export default function SearchBar({ onPayClick }: { onPayClick: () => void }) {
  return (
    <div className="relative animate-slide-in">
      <input
        type="text"
        placeholder="Cari nama, nomor HP, atau @username"
        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        onClick={onPayClick}
        className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
      >
        Bayar
      </button>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

export default function SuccessStep({ onComplete }: { onComplete: () => void }) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="p-4 space-y-6 text-center animate-slide-in">
      <div className="py-8">
        {/* Confetti animation */}
        {showConfetti && (
          <div className="relative h-40 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary rounded-full animate-confetti"
                style={{
                  left: `${25 + i * 10}%`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
            <div className="text-6xl">✓</div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Berhasil!</h2>
        <p className="text-muted-foreground">Uang sudah dikirim ke Budi</p>
        <p className="text-lg font-semibold text-foreground">Rp 100.000</p>
      </div>

      <div className="bg-accent/10 rounded-lg p-3 text-sm text-foreground space-y-1">
        <p>📝 Tx: 0x1234...5678</p>
        <a href="#" className="text-accent hover:underline text-xs">
          Lihat di Explorer
        </a>
      </div>

      <button
        onClick={onComplete}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
      >
        Selesai
      </button>
    </div>
  )
}

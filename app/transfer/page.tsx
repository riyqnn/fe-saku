"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import TransferModal from "@/components/transfer/transfer-modal"

export default function TransferPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary/5 to-transparent pt-4 px-4 pb-6">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={handleClose}
            className="text-2xl hover:opacity-70"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-foreground">Send Money</h1>
        </div>
      </header>

      {/* Transfer Modal Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <TransferModal onClose={handleClose} />
      </main>
    </div>
  )
}

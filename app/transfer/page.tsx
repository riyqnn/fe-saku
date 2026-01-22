"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import TransferModal from "@/components/transfer/transfer-modal"

export default function TransferPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-background/80 dark:from-background dark:via-background dark:to-background/80 backdrop-blur-lg border-b border-border/50 pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={handleClose}
            className="p-2 sm:p-2.5 hover:bg-muted rounded-full transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Send Money
          </h1>
          <div className="w-9 h-9 sm:w-10 sm:h-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Transfer Modal Content */}
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TransferModal onClose={handleClose} />
      </main>
    </div>
  )
}

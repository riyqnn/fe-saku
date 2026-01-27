"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import TransferModal from "@/components/transfer/transfer-modal"
import Header from "@/components/layout/Header"

export default function TransferPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-background pb-8  max-w-lg mx-auto">
      <Header />

      {/* Transfer Modal Content */}
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TransferModal onClose={handleClose} />
      </main>
    </div>
  )
}

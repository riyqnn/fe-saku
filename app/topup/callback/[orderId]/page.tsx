"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useTopupStatus } from "@/hooks/useMidtransTopup"

type TopupStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export default function TopupCallbackPage() {
  const params = useParams()
  const router = useRouter()
  const { checkStatus, loading: isChecking } = useTopupStatus()

  const [status, setStatus] = useState<TopupStatus>('pending')
  const [txHash, setTxHash] = useState("")
  const [amount, setAmount] = useState("")
  const [pollCount, setPollCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const orderId = params.orderId as string

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const pollStatus = async () => {
      try {
        const data = await checkStatus(orderId)

        if (!mounted) return

        setStatus(data.status)
        setAmount(data.amount || "")
        setTxHash(data.contractTxHash || "")

        if (data.status === 'completed') {
          // Stop polling on success
          return
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          // Stop polling on failure
          return
        }

        // Continue polling for pending/processing
        if (pollCount < 60) { // Poll for up to 5 minutes (60 * 5 seconds)
          timeoutId = setTimeout(() => {
            if (mounted) {
              setPollCount(prev => prev + 1)
              pollStatus()
            }
          }, 5000)
        } else {
          setError('Payment verification timed out. Please check your transaction history.')
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to check payment status')
        }
      }
    }

    pollStatus()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [orderId, pollCount, checkStatus])

  const handleDone = () => {
    router.push("/home")
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card dark:bg-card rounded-3xl p-8 shadow-2xl animate-fade-in-up">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Status Icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center">
            {status === 'completed' && (
              <div className="w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            )}
            {(status === 'failed' || status === 'cancelled') && (
              <div className="w-full h-full rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            )}
            {(status === 'pending' || status === 'processing') && (
              <div className="w-full h-full rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            {status === 'completed' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Top Up Successful!</h1>
                <p className="text-muted-foreground">
                  You have successfully topped up {Number(amount).toLocaleString()} IDRX
                </p>
              </>
            )}
            {status === 'processing' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Processing Payment</h1>
                <p className="text-muted-foreground">
                  Your payment is being processed. Please wait...
                </p>
              </>
            )}
            {status === 'pending' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Waiting for Payment</h1>
                <p className="text-muted-foreground">
                  Waiting for payment confirmation. This may take a few moments...
                </p>
              </>
            )}
            {status === 'failed' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Top Up Failed</h1>
                <p className="text-muted-foreground">
                  Your top up could not be completed. Please try again.
                </p>
              </>
            )}
            {status === 'cancelled' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payment Cancelled</h1>
                <p className="text-muted-foreground">
                  You cancelled the payment. If you want to try again, go to the Top Up page.
                </p>
              </>
            )}
            {error && (
              <p className="text-red-500">{error}</p>
            )}
          </div>

          {/* Transaction Hash */}
          {txHash && status === 'completed' && (
            <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Hash</p>
              <p className="text-sm font-mono text-foreground break-all">{txHash}</p>
            </div>
          )}

          {/* Order ID */}
          {orderId && (
            <div className="w-full p-4 rounded-2xl bg-muted/50 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order ID</p>
              <p className="text-sm font-mono text-foreground break-all">{orderId}</p>
            </div>
          )}

          {/* Done Button */}
          <button
            onClick={handleDone}
            disabled={status === 'pending' || status === 'processing' || isChecking}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          >
            {(status === 'pending' || status === 'processing' || isChecking) ? (
              <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Checking status...</>
            ) : (
              'Done'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { ethers } from "ethers"
import { SAKU_REGISTRY_ABI } from "@/lib/abi"
import { CONTRACTS, NETWORK_CONFIG } from "@/lib/config"

export interface Transaction {
  id: string
  type: "transfer_sent" | "transfer_received" | "deposit" | "withdraw" | "qr_created" | "qr_claimed" | "qr_refunded"
  amount: string
  amountRaw: bigint
  timestamp: string
  txHash: string
  blockNumber: number
  status: "completed" | "pending" | "failed"
  from?: string
  to?: string
  fromName?: string
  toName?: string
  fromPhone?: string
  toPhone?: string
}

export function useTransactions(autoRefresh = true) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const formatAmount = (amount: bigint): string => {
    const inTokens = Number(ethers.formatUnits(amount, 6))
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(inTokens)
  }

  const fetchTransactions = async () => {
    try {
      if (!user?.wallet_address || !user?.phone_number) {
        setTransactions([])
        setIsLoading(false)
        return
      }

      setRefreshing(true)
      setError(null)

      // Use multiple RPC providers for fallback
      const rpcUrls = [
        process.env.NEXT_PUBLIC_RPC_URL || NETWORK_CONFIG.rpcUrl,
        "https://base-sepolia.blockpi.network/v1/rpc/public",
        "https://sepolia.base.org",
      ]

      let provider: ethers.JsonRpcProvider | null = null
      let lastError: Error | null = null

      // Try each RPC URL until one works
      for (const rpcUrl of rpcUrls) {
        try {
          provider = new ethers.JsonRpcProvider(rpcUrl)
          await provider.getBlockNumber()
          break
        } catch (err) {
          lastError = err as Error
          provider = null
        }
      }

      if (!provider) {
        throw lastError || new Error("Failed to connect to RPC provider")
      }

      const registryContract = new ethers.Contract(
        CONTRACTS.REGISTRY_ADDRESS,
        SAKU_REGISTRY_ABI,
        provider
      )

      const allTransactions: Transaction[] = []

      // Get current block number to calculate range
      const currentBlock = await provider.getBlockNumber()
      const blocksToQuery = 2000 // Reduced for faster loading
      const fromBlock = Math.max(0, currentBlock - blocksToQuery)

      // Fetch all event types in parallel for speed
      const batchSize = 3000
      const batches: Array<{ start: number; end: number }> = []

      for (let batchStart = fromBlock; batchStart < currentBlock; batchStart += batchSize) {
        batches.push({
          start: batchStart,
          end: Math.min(batchStart + batchSize, currentBlock),
        })
      }

      // Process all batches in parallel
      const batchResults = await Promise.all(
        batches.map(async ({ start, end }) => {
          const batchTransactions: Transaction[] = []

          // Fetch all event types for this batch in parallel
          const [transferEvents, depositEvents, withdrawEvents, qrCreatedEvents, qrClaimedEvents] =
            await Promise.allSettled([
              registryContract.queryFilter(registryContract.filters.Transferred(), start, end),
              registryContract.queryFilter(registryContract.filters.Deposited(), start, end),
              registryContract.queryFilter(registryContract.filters.Withdrawn(), start, end),
              registryContract.queryFilter(registryContract.filters.QRPaymentCreated(), start, end),
              registryContract.queryFilter(registryContract.filters.QRPaymentClaimed(), start, end),
            ])

          // Process Transfer events
          if (transferEvents.status === "fulfilled") {
            for (const event of transferEvents.value) {
              if (!event.args) continue
              const { receiver, sender, amount } = event.args
              const isSent = sender.toLowerCase() === user.wallet_address.toLowerCase()
              const isReceived = receiver.toLowerCase() === user.wallet_address.toLowerCase()

              if (isSent || isReceived) {
                batchTransactions.push({
                  id: `transfer-${event.transactionHash}-${event.logIndex}`,
                  type: isSent ? "transfer_sent" : "transfer_received",
                  amount: formatAmount(amount),
                  amountRaw: amount,
                  timestamp: new Date().toISOString(),
                  txHash: event.transactionHash,
                  blockNumber: event.blockNumber,
                  status: "completed",
                  from: sender,
                  to: receiver,
                  fromName: isSent ? "You" : "Unknown",
                  toName: isReceived ? "You" : "Unknown",
                })
              }
            }
          }

          // Process Deposit events
          if (depositEvents.status === "fulfilled") {
            for (const event of depositEvents.value) {
              if (!event.args) continue
              const { wallet, amount } = event.args
              const isForUser = wallet.toLowerCase() === user.wallet_address.toLowerCase()

              if (isForUser) {
                batchTransactions.push({
                  id: `deposit-${event.transactionHash}-${event.logIndex}`,
                  type: "deposit",
                  amount: formatAmount(amount),
                  amountRaw: amount,
                  timestamp: new Date().toISOString(),
                  txHash: event.transactionHash,
                  blockNumber: event.blockNumber,
                  status: "completed",
                  to: wallet,
                  toName: "You",
                })
              }
            }
          }

          // Process Withdraw events
          if (withdrawEvents.status === "fulfilled") {
            for (const event of withdrawEvents.value) {
              if (!event.args) continue
              const { wallet, amount } = event.args
              const isFromUser = wallet.toLowerCase() === user.wallet_address.toLowerCase()

              if (isFromUser) {
                batchTransactions.push({
                  id: `withdraw-${event.transactionHash}-${event.logIndex}`,
                  type: "withdraw",
                  amount: formatAmount(amount),
                  amountRaw: amount,
                  timestamp: new Date().toISOString(),
                  txHash: event.transactionHash,
                  blockNumber: event.blockNumber,
                  status: "completed",
                  from: wallet,
                  fromName: "You",
                })
              }
            }
          }

          // Process QR Created events
          if (qrCreatedEvents.status === "fulfilled") {
            for (const event of qrCreatedEvents.value) {
              if (!event.args) continue
              const { merchantHash, amount, payer } = event.args
              const isFromUser = payer.toLowerCase() === user.wallet_address.toLowerCase()

              if (isFromUser) {
                batchTransactions.push({
                  id: `qr-created-${event.transactionHash}-${event.logIndex}`,
                  type: "qr_created",
                  amount: formatAmount(amount),
                  amountRaw: amount,
                  timestamp: new Date().toISOString(),
                  txHash: event.transactionHash,
                  blockNumber: event.blockNumber,
                  status: "completed",
                  from: payer,
                  fromName: "You",
                })
              }
            }
          }

          // Process QR Claimed events
          if (qrClaimedEvents.status === "fulfilled") {
            for (const event of qrClaimedEvents.value) {
              if (!event.args) continue
              const { merchant, amount } = event.args
              const isForUser = merchant.toLowerCase() === user.wallet_address.toLowerCase()

              if (isForUser) {
                batchTransactions.push({
                  id: `qr-claimed-${event.transactionHash}-${event.logIndex}`,
                  type: "qr_claimed",
                  amount: formatAmount(amount),
                  amountRaw: amount,
                  timestamp: new Date().toISOString(),
                  txHash: event.transactionHash,
                  blockNumber: event.blockNumber,
                  status: "completed",
                  to: merchant,
                  toName: "You",
                })
              }
            }
          }

          return batchTransactions
        })
      )

      // Flatten all batch results
      batchResults.forEach((batchResult) => {
        allTransactions.push(...batchResult)
      })

      // Get unique block numbers for timestamp fetching
      const uniqueBlocks = [...new Set(allTransactions.map((tx) => tx.blockNumber))]

      // Fetch all block timestamps in parallel
      const blockTimestamps: Record<number, string> = {}
      await Promise.all(
        uniqueBlocks.map(async (blockNumber) => {
          try {
            const block = await provider!.getBlock(blockNumber)
            if (block) {
              blockTimestamps[blockNumber] = new Date(block.timestamp * 1000).toISOString()
            }
          } catch {
            blockTimestamps[blockNumber] = new Date().toISOString()
          }
        })
      )

      // Add timestamps to transactions
      const txWithTimestamps = allTransactions.map((tx) => ({
        ...tx,
        timestamp: blockTimestamps[tx.blockNumber] || tx.timestamp,
      }))

      // Sort by block number descending (newest first)
      txWithTimestamps.sort((a, b) => b.blockNumber - a.blockNumber)

      setTransactions(txWithTimestamps)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      setTransactions([])
    } finally {
      setRefreshing(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [user?.wallet_address, user?.phone_number])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh || !user?.wallet_address) return

    const interval = setInterval(() => {
      fetchTransactions()
    }, 60000)

    return () => clearInterval(interval)
  }, [autoRefresh, user?.wallet_address])

  return {
    transactions,
    isLoading,
    error,
    refetch: fetchTransactions,
    refreshing,
  }
}

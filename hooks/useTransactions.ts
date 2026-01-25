"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"
import { ethers } from "ethers"
import { CONTRACTS } from "@/lib/config"

const MINIMAL_IDRX_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// List RPC yang lebih "lega" untuk Base Sepolia
const PUBLIC_RPCS = [
  "https://sepolia.base.org",
  "https://base-sepolia.blockpi.network/v1/rpc/public",
  "https://base-sepolia-rpc.publicnode.com"
];

export function useTransactions(autoRefresh = true) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTransactions = useCallback(async () => {
    if (!user?.wallet_address) {
      setIsLoading(false)
      return
    }

    try {
      setRefreshing(true)
      
      // Pilih RPC secara acak atau fallback
      const provider = new ethers.JsonRpcProvider(PUBLIC_RPCS[0]);
      const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, MINIMAL_IDRX_ABI, provider)

      const currentBlock = await provider.getBlockNumber()
      
      /** * LOGIC PERBAIKAN: 
       * Kita scan 1000 block terakhir saja. 
       * Kalau RPC kamu masih limit, kita bisa turunkan ke 500.
       */
      const scanRange = 1000; 
      const fromBlock = Math.max(0, currentBlock - scanRange);

      console.log(`📡 Scanning from ${fromBlock} to ${currentBlock}...`);

      const filterSent = idrxContract.filters.Transfer(user.wallet_address, null)
      const filterReceived = idrxContract.filters.Transfer(null, user.wallet_address)

      // Ambil logs
      const [logsSent, logsReceived] = await Promise.all([
        idrxContract.queryFilter(filterSent, fromBlock, currentBlock),
        idrxContract.queryFilter(filterReceived, fromBlock, currentBlock)
      ])

      const rawLogs = [...logsSent, ...logsReceived]
      rawLogs.sort((a: any, b: any) => b.blockNumber - a.blockNumber)

      const latestLogs = rawLogs.slice(0, 8); // Ambil 8 saja buat dashboard

      const formattedTxs = await Promise.all(
        latestLogs.map(async (log: any) => {
          const { from, to, value } = log.args
          const isSent = from.toLowerCase() === user.wallet_address.toLowerCase()
          
          let timestamp = new Date().toISOString()
          try {
            // Kita bungkus getBlock biar kalau gagal satu gak ngerusak semua
            const block = await provider.getBlock(log.blockNumber)
            if (block) timestamp = new Date(block.timestamp * 1000).toISOString()
          } catch (e) { console.warn("Timestamp fail"); }
          
          return {
            id: `${log.transactionHash}-${log.index}`,
            type: isSent ? "transfer_sent" : "transfer_received",
            amount: new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(Number(ethers.formatUnits(value, 6))).replace("Rp", "Rp "),
            timestamp,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            status: "completed",
            from,
            to,
          }
        })
      )

      setTransactions(formattedTxs)
    } catch (err: any) {
      console.error("❌ RPC Error:", err.message);
      // Jika error 10 block plan muncul lagi, kita kasih tau user
      if (err.message.includes("10 block range")) {
        console.error("Ganti RPC woy, limitnya parah banget!");
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [user?.wallet_address])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, isLoading, refreshing, refetch: fetchTransactions }
}
"use client"

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { IDRX_ABI } from '@/lib/abi'; // Tetap pakai ABI yang sama jika fungsinya standar ERC20
import { CONTRACTS, IDRX_DECIMALS } from '@/lib/config';
import { fromTokenAmount } from '@/lib/blockchain';
import { eventBus, EVENTS } from '@/lib/events';

interface BalanceData {
  balance: bigint;
  formattedBalance: string;
}

export function useBalance(address: string | null, refreshTrigger?: number) {
  const [data, setData] = useState<BalanceData>({
    balance: BigInt(0),
    formattedBalance: '0.00',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      if (!address) {
        setIsLoading(false);
        setData({
          balance: BigInt(0),
          formattedBalance: '0.00',
        });
        return;
      }

      setIsLoading(true);
      setRefreshing(true);

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
      );

      // Pastikan CONTRACTS.IDRX_ADDRESS sudah merujuk ke contract USDC yang baru di Base
      const contract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, provider);

      const balance: bigint = await contract.balanceOf(address);

      // Konversi ke angka desimal
      const balanceInTokens = Number(fromTokenAmount(balance, IDRX_DECIMALS));

      // Format ke USDC (US Dollar format)
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(balanceInTokens);

      setData({
        balance,
        formattedBalance: formatted,
      });
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error("Balance fetch error:", err);
      setError(err.message);
      setIsLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address, refreshTrigger]);

  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      fetchBalance();
    }, 5000); 

    return () => clearInterval(interval);
  }, [address]);

  useEffect(() => {
    if (!address) return;
    const handleRefresh = () => fetchBalance();
    eventBus.on(EVENTS.BALANCE_REFRESH, handleRefresh);
    return () => eventBus.off(EVENTS.BALANCE_REFRESH, handleRefresh);
  }, [address]);

  return {
    balance: data.balance,
    formattedBalance: data.formattedBalance, // Ini bakal keluar "10.50" dsb.
    isLoading,
    error,
    refetch: fetchBalance,
    refreshing,
  };
}
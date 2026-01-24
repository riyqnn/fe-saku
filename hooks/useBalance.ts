import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { IDRX_ABI } from '@/lib/abi';
import { CONTRACTS, IDRX_DECIMALS } from '@/lib/config';
import { fromTokenAmount } from '@/lib/blockchain';
import { eventBus, EVENTS } from '@/lib/events';

interface BalanceData {
  balance: bigint;
  formattedBalance: string;
  formattedUSD?: string;
}

export function useBalance(address: string | null, refreshTrigger?: number) {
  const [data, setData] = useState<BalanceData>({
    balance: BigInt(0),
    formattedBalance: 'Rp 0',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      if (!address) {
        console.log('⚠️ [useBalance] No address provided');
        setIsLoading(false);
        setData({
          balance: BigInt(0),
          formattedBalance: 'Rp 0',
        });
        return;
      }

      setIsLoading(true);
      setRefreshing(true);
      console.log('📱 [useBalance] Fetching balance for:', address);

      // Get provider
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
      );

      // Create contract instance for reading
      const contract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, provider);

      // Fetch balance from blockchain
      const balance: bigint = await contract.balanceOf(address);
      console.log('✅ [useBalance] Raw balance:', balance.toString());

      // Format as IDR (assuming 1 IDRX = 1 IDR)
      const balanceInTokens = Number(fromTokenAmount(balance, IDRX_DECIMALS));
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(balanceInTokens);

      console.log('💰 [useBalance] Formatted:', formatted);

      setData({
        balance,
        formattedBalance: formatted,
      });
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('❌ [useBalance] Error:', err.message);
      setError(err.message);
      setIsLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchBalance();
  }, [address, refreshTrigger]);

  // Poll for balance updates every 5 seconds (faster updates)
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 5000); // Reduced from 10000 (10s) to 5000 (5s)

    return () => clearInterval(interval);
  }, [address]);

  // Listen for balance refresh events
  useEffect(() => {
    if (!address) return;

    const handleRefresh = () => {
      console.log('🔄 [useBalance] Refresh triggered by event');
      fetchBalance();
    };

    eventBus.on(EVENTS.BALANCE_REFRESH, handleRefresh);

    return () => {
      eventBus.off(EVENTS.BALANCE_REFRESH, handleRefresh);
    };
  }, [address]);

  return {
    balance: data.balance,
    formattedBalance: data.formattedBalance,
    isLoading,
    error,
    refetch: fetchBalance,
    refreshing,
  };
}

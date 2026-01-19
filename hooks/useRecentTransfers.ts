import { useState, useEffect } from 'react';
import { fromTokenAmount } from '@/lib/blockchain';
import { IDRX_DECIMALS } from '@/lib/config';

export interface Transfer {
  id: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  amount: string;
  amountRaw: bigint;
  timestamp: string;
  type: 'sent' | 'received';
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

export function useRecentTransfers(userPhone: string | null, limit: number = 5) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransfers = async () => {
    try {
      if (!userPhone) {
        console.log('⚠️ [useRecentTransfers] No user phone provided');
        setIsLoading(false);
        setTransfers([]);
        return;
      }

      setIsLoading(true);
      setRefreshing(true);
      setError(null);
      console.log('📱 [useRecentTransfers] Fetching transfers for:', userPhone);

      // TODO: Integrate with blockchain event logs to fetch on-chain transfers
      // For now, return empty list as transfers are stored on-chain, not in database
      console.log('ℹ️ [useRecentTransfers] Transfer history will be fetched from blockchain events');
      
      setTransfers([]);
      setError(null);
    } catch (err: any) {
      console.error('❌ [useRecentTransfers] Error:', err.message);
      setError(err.message);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [userPhone]);

  // Poll for new transfers every 15 seconds
  useEffect(() => {
    if (!userPhone) return;

    const interval = setInterval(() => {
      fetchTransfers();
    }, 15000);

    return () => clearInterval(interval);
  }, [userPhone]);

  return {
    transfers,
    isLoading,
    error,
    refetch: fetchTransfers,
    refreshing,
  };
}

function formatAmount(amount: bigint): string {
  const inTokens = Number(fromTokenAmount(amount, IDRX_DECIMALS));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(inTokens);
}

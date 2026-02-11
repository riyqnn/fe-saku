import { useState, useEffect, useCallback } from 'react';

export interface StakingInfo {
  totalStaked: string;
  userStaked: string;
  pendingRewards: string;
  minStakeAmount: string;
  walletAddress: string;
}

export interface StakeResult {
  success: boolean;
  amount?: string;
  stUSDCReceived?: string;
  txHash?: string;
  error?: string;
}

export interface UnstakeResult {
  success: boolean;
  amountUnstaked?: string;
  amountReceived?: string;
  txHash?: string;
  error?: string;
}

export interface ClaimResult {
  success: boolean;
  amount?: string;
  txHash?: string;
  error?: string;
}

export function useStaking(token: string | null) {
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingInfo = useCallback(async () => {
    if (!token) {
      setStakingInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/staking/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staking info');
      }

      setStakingInfo(data.staking);
    } catch (err: any) {
      setError(err.message);
      setStakingInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const stake = useCallback(async (amount: number): Promise<StakeResult> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setIsStaking(true);
      setError(null);

      const response = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stake');
      }

      // Refresh staking info after successful stake
      await fetchStakingInfo();

      return {
        success: true,
        amount: data.stakedAmount,
        stUSDCReceived: data.stUSDCReceived,
        txHash: data.transactionHash,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to stake';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsStaking(false);
    }
  }, [token, fetchStakingInfo]);

  const unstake = useCallback(async (amount: string | 'all'): Promise<UnstakeResult> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setIsUnstaking(true);
      setError(null);

      const response = await fetch('/api/staking/unstake', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unstake');
      }

      // Refresh staking info after successful unstake
      await fetchStakingInfo();

      return {
        success: true,
        amountUnstaked: data.amountUnstaked,
        amountReceived: data.amountReceived,
        txHash: data.transactionHash,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to unstake';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnstaking(false);
    }
  }, [token, fetchStakingInfo]);

  const claimRewards = useCallback(async (): Promise<ClaimResult> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setIsClaiming(true);
      setError(null);

      const response = await fetch('/api/staking/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim rewards');
      }

      // Refresh staking info after successful claim
      await fetchStakingInfo();

      return {
        success: true,
        amount: data.claimedAmount,
        txHash: data.transactionHash,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to claim rewards';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsClaiming(false);
    }
  }, [token, fetchStakingInfo]);

  // Fetch on mount and when token changes
  useEffect(() => {
    fetchStakingInfo();
  }, [fetchStakingInfo]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetchStakingInfo();
    }, 10000);

    return () => clearInterval(interval);
  }, [token, fetchStakingInfo]);

  return {
    // State
    stakingInfo,
    isLoading,
    isStaking,
    isUnstaking,
    isClaiming,
    error,

    // Functions
    fetchStakingInfo,
    stake,
    unstake,
    claimRewards,
  };
}

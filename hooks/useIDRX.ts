import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export function useIDRX(signer: ethers.Signer | null, address: string | null) {
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create contract instance for transactions
  const contract = signer
    ? new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, signer)
    : null;

  // Create read-only contract instance for view functions
  const getReadContract = () => {
    const provider = signer?.provider || new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
    );
    return new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, provider);
  };

  // Fetch balance
  const fetchBalance = async () => {
    try {
      if (!address) return;

      const readContract = getReadContract();
      const bal = await readContract.balanceOf(address);
      setBalance(bal);
    } catch (err: any) {
    }
  };

  // Fetch allowance for Registry contract
  const fetchAllowance = async () => {
    try {
      if (!address) return;

      const readContract = getReadContract();
      const allow = await readContract.allowance(address, CONTRACTS.REGISTRY_ADDRESS);
      setAllowance(allow);
    } catch (err: any) {
    }
  };

  // Approve Registry to spend IDRX
  const approve = async (amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.approve(CONTRACTS.REGISTRY_ADDRESS, amount);
      const receipt = await tx.wait();

      // Refresh allowance after approval
      await fetchAllowance();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Approve unlimited amount (useful for gas optimization)
  const approveUnlimited = async () => {
    const unlimitedAmount = ethers.MaxUint256;
    return approve(unlimitedAmount);
  };

  // Transfer IDRX directly (peer-to-peer, not through Registry)
  const transfer = async (to: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (amount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      const tx = await contract.transfer(to, amount);
      const receipt = await tx.wait();

      // Refresh balance after transfer
      await fetchBalance();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Transfer from (if approved as spender)
  const transferFrom = async (from: string, to: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (amount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      const tx = await contract.transferFrom(from, to, amount);
      const receipt = await tx.wait();

      // Refresh balances
      await fetchBalance();
      await fetchAllowance();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get token info
  const getName = async (): Promise<string> => {
    try {
      const readContract = getReadContract();
      return await readContract.name();
    } catch (err: any) {
      throw err;
    }
  };

  const getSymbol = async (): Promise<string> => {
    try {
      const readContract = getReadContract();
      return await readContract.symbol();
    } catch (err: any) {
      throw err;
    }
  };

  const getDecimals = async (): Promise<number> => {
    try {
      const readContract = getReadContract();
      return await readContract.decimals();
    } catch (err: any) {
      throw err;
    }
  };

  // Get total supply
  const getTotalSupply = async (): Promise<bigint> => {
    try {
      const readContract = getReadContract();
      return await readContract.totalSupply();
    } catch (err: any) {
      throw err;
    }
  };

  // Check if allowance is sufficient
  const hasAllowance = async (requiredAmount: bigint): Promise<boolean> => {
    return allowance >= requiredAmount;
  };

  // Auto-fetch balance and allowance on mount and when address/signer changes
  useEffect(() => {
    fetchBalance();
    fetchAllowance();
  }, [address, signer]);

  return {
    // State
    balance,
    allowance,
    isLoading,
    error,

    // Write functions
    approve,
    approveUnlimited,
    transfer,
    transferFrom,

    // Read functions
    fetchBalance,
    fetchAllowance,

    // Token info
    getName,
    getSymbol,
    getDecimals,
    getTotalSupply,

    // Utility
    hasAllowance,
  };
}

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export function useIDRX(signer: ethers.Signer | null, address: string | null) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = signer
    ? new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, signer)
    : null;

  // Fetch balance
  const fetchBalance = async () => {
    try {
      if (!contract || !address) return;

      const bal = await contract.balanceOf(address);
      setBalance(bal);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
    }
  };

  // Fetch allowance for Registry contract
  const fetchAllowance = async () => {
    try {
      if (!contract || !address) return;

      const allow = await contract.allowance(address, CONTRACTS.REGISTRY_ADDRESS);
      setAllowance(allow);
    } catch (err: any) {
      console.error('Failed to fetch allowance:', err);
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

      await fetchAllowance();
      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Transfer IDRX directly
  const transfer = async (to: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.transfer(to, amount);
      const receipt = await tx.wait();

      await fetchBalance();
      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch balance on mount and address change
  useEffect(() => {
    fetchBalance();
    fetchAllowance();
  }, [address, contract]);

  return {
    balance,
    allowance,
    approve,
    transfer,
    fetchBalance,
    fetchAllowance,
    isLoading,
    error,
  };
}
import { useState } from 'react';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';

export function useRegistry(signer: ethers.Signer | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = signer
    ? new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer)
    : null;

  // Check if phone is registered
  const isRegistered = async (phoneNumber: string): Promise<boolean> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhoneNumber(phoneNumber);
      return await contract.isRegistered(phoneHash);
    } catch (err: any) {
      console.error('Failed to check registration:', err);
      throw err;
    }
  };

  // Get wallet address from phone
  const getAccount = async (phoneNumber: string): Promise<string> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhoneNumber(phoneNumber);
      return await contract.getAccount(phoneHash);
    } catch (err: any) {
      console.error('Failed to get account:', err);
      throw err;
    }
  };

  // Register phone hash (admin only - backend should call this)
  const register = async (phoneNumber: string, walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhoneNumber(phoneNumber);
      const tx = await contract.register(phoneHash, walletAddress);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Transfer IDRX by phone number
  const transferByPhone = async (receiverPhone: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const receiverHash = hashPhoneNumber(receiverPhone);
      const tx = await contract.transferIDRX(receiverHash, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Transfer IDRX by address
  const transferByAddress = async (receiverAddress: string, amount: bigint) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.transferIDRXDirect(receiverAddress, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update registration
  const updateRegistration = async (phoneNumber: string, newAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhoneNumber(phoneNumber);
      const tx = await contract.updateRegistration(phoneHash, newAddress);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isRegistered,
    getAccount,
    register,
    transferByPhone,
    transferByAddress,
    updateRegistration,
    isLoading,
    error,
  };
}
import { useState } from 'react';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS, IDRX_DECIMALS } from '@/lib/config';
import { fromTokenAmount, toTokenAmount } from '@/lib/blockchain';

export enum DistributionType {
  EQUAL = 0,
  RANDOM = 1
}

export interface AmplopDetails {
  creator: string;
  maxWinners: number;
  totalAmount: string;
  claimedCount: number;
  totalClaimed: string;
  createdAt: number;
  exists: boolean;
}

export interface CreateAmplopResult {
  amplopId: string;
  receipt: ethers.ContractTransactionReceipt;
}

export interface ClaimAmplopResult {
  claimedAmount: string;
  receipt: ethers.ContractTransactionReceipt;
}

/**
 * Generate a random packet code
 */
export function generatePacketCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate packet code format
 */
export function validatePacketCode(code: string): boolean {
  return /^[A-Za-z0-9]{4,32}$/.test(code);
}

export function usePacket(signer: ethers.Signer | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = signer
    ? new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer)
    : null;

  /**
   * Create a new amplop/packet using SIMPLIFIED contract
   * createAmplop(id, maxWinners, amount) - no senderName, message, distType
   */
  const createPacket = async (
    packetCode: string,
    totalAmount: string,
    maxWinners: number
  ): Promise<CreateAmplopResult> => {
    try {
      setIsCreating(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (maxWinners < 1 || maxWinners > 500) throw new Error('Max winners must be between 1 and 500');

      const tokenAmount = toTokenAmount(totalAmount, IDRX_DECIMALS);
      if (tokenAmount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      // Generate amplopId from packetCode using keccak256
      const amplopId = ethers.keccak256(ethers.toUtf8Bytes(packetCode));

      // Create amplop with simplified function: createAmplop(id, maxWinners, amount)
      const tx = await contract.createAmplop(amplopId, maxWinners, tokenAmount);
      const receipt = await tx.wait();

      return { amplopId, receipt };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create packet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Claim a packet using the amplopId and calculated amount
   * claimAmplop(id, amount) - amount is calculated off-chain
   */
  const claimPacket = async (amplopId: string, claimAmount: string): Promise<ClaimAmplopResult> => {
    try {
      setIsClaiming(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (!amplopId) throw new Error('Amplop ID is required');

      const claimAmountToken = toTokenAmount(claimAmount, IDRX_DECIMALS);

      // Claim with amount: claimAmplop(id, amount)
      const tx = await contract.claimAmplop(amplopId, claimAmountToken);
      const receipt = await tx.wait();

      return {
        claimedAmount: claimAmount,
        receipt
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to claim packet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  };

  /**
   * Get simplified amplop details by ID
   */
  const getAmplop = async (amplopId: string): Promise<AmplopDetails> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      const amplop = await contract.getAmplop(amplopId);

      return {
        creator: amplop.creator,
        maxWinners: Number(amplop.maxWinners),
        totalAmount: fromTokenAmount(amplop.totalAmount, IDRX_DECIMALS),
        claimedCount: Number(amplop.claimedCount),
        totalClaimed: fromTokenAmount(amplop.totalClaimed, IDRX_DECIMALS),
        createdAt: Number(amplop.createdAt),
        exists: amplop.exists,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get packet details';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Get amplop expiry time in seconds (1 day in simplified contract)
   */
  const getAmplopExpiry = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.AMPLOP_EXPIRY();
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Refund expired amplop (creator only)
   */
  const refundAmplop = async (amplopId: string): Promise<ethers.ContractTransactionReceipt> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.refundAmplop(amplopId);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refund packet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    isLoading,
    isCreating,
    isClaiming,
    error,

    // Functions
    createPacket,
    claimPacket,
    getAmplop,
    getAmplopExpiry,
    refundAmplop,
  };
}

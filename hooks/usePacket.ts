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
  senderName: string;
  message: string;
  totalAmount: string;
  maxWinners: number;
  distType: DistributionType;
  amountPerWinner: string;
  createdAt: number;
  expiry: number;
  claimedCount: number;
  totalClaimed: string;
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
 * @param length Length of the code (default 8)
 * @returns Random alphanumeric code
 */
export function generatePacketCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I, L)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate packet code format
 * @param code Packet code to validate
 * @returns true if valid, false otherwise
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
   * Create a new amplop/packet (shareable red envelope)
   * Uses the Amplop function from the smart contract
   */
  const createPacket = async (
    senderName: string,
    message: string,
    totalAmount: string,
    maxWinners: number,
    distType: DistributionType
  ): Promise<CreateAmplopResult> => {
    try {
      setIsCreating(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (maxWinners < 1 || maxWinners > 500) throw new Error('Max winners must be between 1 and 500');

      const tokenAmount = toTokenAmount(totalAmount, IDRX_DECIMALS);
      if (tokenAmount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      // Create the transaction using createAmplop
      const tx = await contract.createAmplop(
        senderName || "",
        message || "",
        tokenAmount,
        maxWinners,
        distType
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Get the amplopId from the transaction logs
      let amplopId = '';

      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'AmplopCreated') {
              amplopId = parsed.args.amplopId;
              break;
            }
          } catch (e) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }

      if (!amplopId) {
        throw new Error('Could not extract amplopId from transaction');
      }

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
   * Claim a packet using the amplopId
   */
  const claimPacket = async (amplopId: string): Promise<ClaimAmplopResult> => {
    try {
      setIsClaiming(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (!amplopId) throw new Error('Amplop ID is required');

      const tx = await contract.claimAmplop(amplopId);
      const receipt = await tx.wait();

      // Extract claimed amount from event
      let claimedAmount = BigInt(0);
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'AmplopClaimed') {
              claimedAmount = parsed.args.amount;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      return {
        claimedAmount: fromTokenAmount(claimedAmount, IDRX_DECIMALS),
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
   * Get amplop details by ID
   */
  const getAmplop = async (amplopId: string): Promise<AmplopDetails> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      const amplop = await contract.getAmplop(amplopId);

      return {
        creator: amplop.creator,
        senderName: amplop.senderName,
        message: amplop.message,
        totalAmount: fromTokenAmount(amplop.totalAmount, IDRX_DECIMALS),
        maxWinners: Number(amplop.maxWinners),
        distType: Number(amplop.distType) as DistributionType,
        amountPerWinner: fromTokenAmount(amplop.amountPerWinner, IDRX_DECIMALS),
        createdAt: Number(amplop.createdAt),
        expiry: Number(amplop.expiry),
        claimedCount: Number(amplop.claimedCount),
        totalClaimed: fromTokenAmount(amplop.totalClaimed, IDRX_DECIMALS),
        exists: amplop.exists,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get packet details';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Check if current user has claimed a packet
   */
  const hasClaimed = async (amplopId: string, walletAddress: string): Promise<boolean> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      return await contract.hasClaimedAmplop(amplopId, walletAddress);
    } catch (err) {
      return false;
    }
  };

  /**
   * Get remaining amount and winners
   */
  const getAmplopRemaining = async (amplopId: string): Promise<{ remaining: string; remainingWinners: number }> => {
    try {
      if (!contract) throw new Error('Wallet not connected');
      const [remaining, remainingWinners] = await contract.getAmplopRemaining(amplopId);
      return {
        remaining: fromTokenAmount(remaining, IDRX_DECIMALS),
        remainingWinners: Number(remainingWinners),
      };
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Get amplop expiry time in seconds (default: 7 days)
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
  const refundExpiredAmplop = async (amplopId: string): Promise<ethers.ContractTransactionReceipt> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.refundExpiredAmplop(amplopId);
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

  /**
   * Check if packet is expired
   */
  const isPacketExpired = async (amplopId: string): Promise<boolean> => {
    try {
      const amplop = await getAmplop(amplopId);
      const now = Math.floor(Date.now() / 1000);
      return amplop.expiry < now;
    } catch (err) {
      return false;
    }
  };

  /**
   * Calculate time remaining until packet expires
   */
  const getTimeUntilExpiry = async (amplopId: string): Promise<number> => {
    try {
      const amplop = await getAmplop(amplopId);
      const now = Math.floor(Date.now() / 1000);
      const remaining = amplop.expiry - now;
      return remaining > 0 ? remaining : 0;
    } catch (err) {
      return 0;
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
    hasClaimed,
    getAmplopRemaining,
    getAmplopExpiry,
    refundExpiredAmplop,
    isPacketExpired,
    getTimeUntilExpiry,
  };
}

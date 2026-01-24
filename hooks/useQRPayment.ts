import { useState } from 'react';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';

export interface QRPaymentDetails {
  merchantHash: string;
  payer: string;
  amount: bigint;
  timestamp: bigint;
  claimed: boolean;
  exists: boolean;
}

export interface CreateQRPaymentResult {
  qrHash: string;
  receipt: ethers.ContractTransactionReceipt;
}

export function useQRPayment(signer: ethers.Signer | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = signer
    ? new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer)
    : null;

  /**
   * Create a new QR payment
   * User locks IDRX tokens for a merchant to claim later
   */
  const createQRPayment = async (
    merchantPhone: string,
    amount: bigint
  ): Promise<CreateQRPaymentResult> => {
    try {
      setIsCreating(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (amount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      const merchantHash = hashPhoneNumber(merchantPhone);

      // Create the transaction
      const tx = await contract.createQRPayment(merchantHash, amount);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Get the QR hash from the transaction logs
      let qrHash = '';

      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'QRPaymentCreated') {
              // qrHash is the first indexed parameter
              qrHash = parsed.args.qrHash || log.topics[1];
              break;
            }
          } catch (e) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }

      if (!qrHash) {
        throw new Error('Could not extract QR hash from transaction');
      }

      return { qrHash, receipt };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create QR payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Claim a QR payment as a merchant
   * Only the merchant with the matching phone hash can claim
   */
  const claimQRPayment = async (qrHash: string): Promise<ethers.ContractTransactionReceipt> => {
    try {
      setIsClaiming(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.claimQRPayment(qrHash);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to claim QR payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  };

  /**
   * Refund an expired QR payment
   * Payer can refund if payment hasn't been claimed within QR_PAYMENT_EXPIRY (24 hours)
   */
  const refundQRPayment = async (qrHash: string): Promise<ethers.ContractTransactionReceipt> => {
    try {
      setIsRefunding(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const tx = await contract.refundQRPayment(qrHash);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refund QR payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsRefunding(false);
    }
  };

  /**
   * Get QR payment details
   * Returns payment information including status, amount, participants, etc.
   */
  const getQRPayment = async (qrHash: string): Promise<QRPaymentDetails> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      const paymentDetails = await contract.getQRPayment(qrHash);

      return {
        merchantHash: paymentDetails.merchantHash,
        payer: paymentDetails.payer,
        amount: paymentDetails.amount,
        timestamp: paymentDetails.timestamp,
        claimed: paymentDetails.claimed,
        exists: paymentDetails.exists,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get QR payment details';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Check if QR payment can be refunded
   * Payment is refundable after 24 hours if not claimed
   */
  const canRefundQRPayment = async (qrHash: string): Promise<boolean> => {
    try {
      const payment = await getQRPayment(qrHash);

      if (!payment.exists) {
        return false;
      }

      if (payment.claimed) {
        return false;
      }

      // Check if 24 hours have passed
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (!contract) return false;
      const expiry = await contract.QR_PAYMENT_EXPIRY();

      return payment.timestamp + expiry < now;
    } catch (err) {
      console.error('Failed to check refund eligibility:', err);
      return false;
    }
  };

  /**
   * Get QR payment expiry time in seconds (default: 24 hours)
   */
  const getQRPaymentExpiry = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      return await contract.QR_PAYMENT_EXPIRY();
    } catch (err: any) {
      console.error('Failed to get QR payment expiry:', err);
      throw err;
    }
  };

  /**
   * Calculate time remaining until QR payment expires
   * Returns 0 if already expired
   */
  const getTimeUntilExpiry = async (qrHash: string): Promise<bigint> => {
    try {
      const payment = await getQRPayment(qrHash);
      const expiry = await getQRPaymentExpiry();

      const expiryTime = payment.timestamp + expiry;
      const now = BigInt(Math.floor(Date.now() / 1000));

      return expiryTime > now ? expiryTime - now : BigInt(0);
    } catch (err) {
      console.error('Failed to calculate time until expiry:', err);
      return BigInt(0);
    }
  };

  return {
    // State
    isLoading,
    isCreating,
    isClaiming,
    isRefunding,
    error,

    // Functions
    createQRPayment,
    claimQRPayment,
    refundQRPayment,
    getQRPayment,
    canRefundQRPayment,
    getQRPaymentExpiry,
    getTimeUntilExpiry,
  };
}

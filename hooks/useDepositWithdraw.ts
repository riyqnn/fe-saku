import { useState } from 'react';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';

export interface WithdrawResult {
  receipt: ethers.ContractTransactionReceipt;
  amountAfterFee: bigint;
  fee: bigint;
}

export function useDepositWithdraw(signer: ethers.Signer | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = signer
    ? new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer)
    : null;

  /**
   * Deposit IDRX tokens to the user's own wallet
   * User must approve the contract to spend their tokens first
   */
  const deposit = async (
    phoneNumber: string,
    amount: bigint
  ): Promise<ethers.ContractTransactionReceipt> => {
    try {
      setIsDepositing(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (amount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      const phoneHash = hashPhoneNumber(phoneNumber);

      const tx = await contract.deposit(phoneHash, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to deposit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsDepositing(false);
    }
  };

  /**
   * Deposit IDRX tokens to another user's wallet
   * Useful for sending deposits directly to other users
   */
  const depositTo = async (
    receiverPhone: string,
    amount: bigint
  ): Promise<ethers.ContractTransactionReceipt> => {
    try {
      setIsDepositing(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (amount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      const receiverHash = hashPhoneNumber(receiverPhone);

      const tx = await contract.depositTo(receiverHash, amount);
      const receipt = await tx.wait();

      return receipt;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to deposit to recipient';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsDepositing(false);
    }
  };

  /**
   * Withdraw IDRX tokens from wallet to an external address
   * Charges a 1% fee (WITHDRAW_FEE_BPS = 100 basis points)
   */
  const withdraw = async (
    phoneNumber: string,
    toAddress: string,
    amount: bigint
  ): Promise<WithdrawResult> => {
    try {
      setIsWithdrawing(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');
      if (amount <= BigInt(0)) throw new Error('Amount must be greater than 0');

      const phoneHash = hashPhoneNumber(phoneNumber);

      // Calculate fee (1%)
      const feeBps = await contract.WITHDRAW_FEE_BPS();
      const fee = (amount * feeBps) / BigInt(10000);
      const amountAfterFee = amount - fee;

      const tx = await contract.withdraw(phoneHash, toAddress, amount);
      const receipt = await tx.wait();

      return {
        receipt,
        amountAfterFee,
        fee,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to withdraw';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  /**
   * Withdraw all IDRX tokens from wallet to an external address
   * Charges a 1% fee on the entire balance
   */
  const withdrawAll = async (
    phoneNumber: string,
    toAddress: string
  ): Promise<WithdrawResult> => {
    try {
      setIsWithdrawing(true);
      setError(null);

      if (!contract) throw new Error('Wallet not connected');

      const phoneHash = hashPhoneNumber(phoneNumber);

      const tx = await contract.withdrawAll(phoneHash, toAddress);
      const receipt = await tx.wait();

      // Calculate fee from the transaction
      // Parse the Withdrawn event to get exact amounts
      let amount = BigInt(0);
      let fee = BigInt(0);

      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'Withdrawn') {
              amount = parsed.args.amount || BigInt(0);
              fee = parsed.args.fee || BigInt(0);
              break;
            }
          } catch (e) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }

      const amountAfterFee = amount - fee;

      return {
        receipt,
        amountAfterFee,
        fee,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to withdraw all';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  /**
   * Get the withdraw fee in basis points (default: 100 = 1%)
   */
  const getWithdrawFeeBps = async (): Promise<bigint> => {
    try {
      if (!contract) throw new Error('Wallet not connected');

      return await contract.WITHDRAW_FEE_BPS();
    } catch (err: any) {
      console.error('Failed to get withdraw fee bps:', err);
      throw err;
    }
  };

  /**
   * Calculate withdraw fee for a given amount
   */
  const calculateWithdrawFee = async (amount: bigint): Promise<bigint> => {
    try {
      const feeBps = await getWithdrawFeeBps();
      return (amount * feeBps) / BigInt(10000);
    } catch (err) {
      console.error('Failed to calculate withdraw fee:', err);
      return BigInt(0);
    }
  };

  /**
   * Calculate amount after fee
   */
  const calculateAmountAfterFee = async (amount: bigint): Promise<bigint> => {
    try {
      const fee = await calculateWithdrawFee(amount);
      return amount - fee;
    } catch (err) {
      console.error('Failed to calculate amount after fee:', err);
      return amount;
    }
  };

  return {
    // State
    isLoading,
    isDepositing,
    isWithdrawing,
    error,

    // Deposit functions
    deposit,
    depositTo,

    // Withdraw functions
    withdraw,
    withdrawAll,

    // Fee calculation
    getWithdrawFeeBps,
    calculateWithdrawFee,
    calculateAmountAfterFee,
  };
}

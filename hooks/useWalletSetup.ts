import { useState } from 'react';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export interface WalletSetupResponse {
  success: boolean;
  message: string;
  address: string;
  isNewUser: boolean;
  txHash?: string;
}

export function useWalletSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  /**
   * Setup wallet untuk user baru
   * Flow:
   * 1. Create wallet di backend
   * 2. Call smart contract register function
   * 3. Return wallet address
   */
  const setupWallet = async (phoneNumber: string, signer: ethers.Signer): Promise<WalletSetupResponse> => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Create wallet di backend
      setProgress('Creating wallet...');
      console.log('📱 [useWalletSetup] Creating wallet for phone:', phoneNumber);

      const setupResponse = await fetch('/api/setup-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || 'Failed to setup wallet');
      }

      const setupData: WalletSetupResponse = await setupResponse.json();

      if (!setupData.success) {
        throw new Error(setupData.message);
      }

      // Jika user sudah punya wallet, return langsung
      if (!setupData.isNewUser) {
        console.log('✅ [useWalletSetup] User already has wallet:', setupData.address);
        return setupData;
      }

      console.log('✅ [useWalletSetup] Wallet created:', setupData.address);

      // Step 2: Register wallet ke smart contract
      setProgress('Registering on blockchain...');
      console.log('📝 [useWalletSetup] Registering wallet on smart contract');

      const provider = signer.provider;
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Create registry contract instance
      const registry = new ethers.Contract(
        CONTRACTS.REGISTRY_ADDRESS,
        SAKU_REGISTRY_ABI,
        signer
      );

      // Call register function
      // Note: Backend akan handle phone number hashing
      const registerResponse = await fetch('/api/register-wallet-onchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: setupData.address,
          phoneNumber: phoneNumber,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Failed to register on blockchain');
      }

      const registerData = await registerResponse.json();

      if (!registerData.success) {
        throw new Error(registerData.message);
      }

      console.log('✅ [useWalletSetup] Registered on blockchain:', registerData.txHash);

      setProgress('');
      return {
        success: true,
        message: 'Wallet created and registered successfully',
        address: setupData.address,
        isNewUser: true,
        txHash: registerData.txHash,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Wallet setup failed';
      setError(errorMsg);
      console.error('❌ [useWalletSetup] Error:', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  return {
    setupWallet,
    isLoading,
    error,
    progress,
  };
}

'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useWalletSetup } from '@/hooks/useWalletSetup';
import { useAuth } from '@/hooks/useAuth';

export function SetupWalletFlow() {
  const { address: walletAddress, signer } = useWallet();
  const { user } = useAuth();
  const { setupWallet, isLoading, error, progress } = useWalletSetup();
  const [setupDone, setSetupDone] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);

  const handleSetupWallet = async () => {
    try {
      if (!signer) {
        alert('Please connect your wallet first');
        return;
      }

      if (!user?.phone) {
        alert('Phone number not found');
        return;
      }

      const result = await setupWallet(user.phone, signer);
      setWalletInfo(result);
      setSetupDone(true);
    } catch (err: any) {
      console.error('Setup wallet error:', err);
    }
  };

  if (!user) {
    return <div className="text-center py-8">Please login first</div>;
  }

  if (setupDone) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-green-800 mb-4">✅ Wallet Setup Complete</h2>
        
        <div className="space-y-3 mb-6">
          <div>
            <p className="text-sm text-gray-600">Phone Number</p>
            <p className="font-mono text-lg font-semibold">{user.phone}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Wallet Address</p>
            <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
              {walletInfo?.address}
            </p>
          </div>

          {walletInfo?.txHash && (
            <div>
              <p className="text-sm text-gray-600">Transaction Hash</p>
              <a
                href={`https://sepolia.basescan.org/tx/${walletInfo.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-blue-600 hover:underline break-all"
              >
                {walletInfo.txHash}
              </a>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setSetupDone(false);
            setWalletInfo(null);
          }}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Setup Another Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-blue-900 mb-4">💼 Setup Your Wallet</h2>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Phone Number</p>
          <p className="font-mono text-lg font-semibold">{user.phone}</p>
        </div>

        {walletAddress && (
          <div>
            <p className="text-sm text-gray-600 mb-1">MetaMask Address</p>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
              {walletAddress}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {progress && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <p className="text-sm">⏳ {progress}</p>
        </div>
      )}

      <button
        onClick={handleSetupWallet}
        disabled={isLoading || !signer}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Setting up wallet...' : 'Create & Register Wallet'}
      </button>

      <p className="text-xs text-gray-600 mt-3 text-center">
        This will create a new wallet linked to your phone number and register it on the blockchain
      </p>
    </div>
  );
}

"use client"

import { useUserWallet } from '@/hooks/useUserWallet';
import { useState } from 'react';

export default function WalletDetail() {
  const { walletAddress, phoneNumber, isVerified, isLoading } = useUserWallet();
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
        <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        <div className="flex gap-4">
          <div className="flex-1 h-12 bg-gray-300 rounded"></div>
          <div className="flex-1 h-12 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-gray-300 text-center">
        <p className="text-gray-500 text-sm">⚠️ Wallet not created yet</p>
      </div>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;

  return (
    <div className="space-y-3">
      {/* Wallet Address Card */}
      <div 
        onClick={copyAddress}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 cursor-pointer hover:from-slate-800 hover:to-slate-700 transition-all active:scale-98 text-white shadow-lg"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Wallet Address</p>
          <span className="text-lg">{copied ? '✅' : '📋'}</span>
        </div>
        <p className="text-sm font-mono tracking-wider break-all">{walletAddress}</p>
        <p className="text-xs opacity-60 mt-2">{copied ? '✅ Copied!' : '👆 Tap to copy'}</p>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Phone */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">📱 Phone</p>
          <p className="text-sm font-mono text-blue-900 mt-2">
            {phoneNumber ? phoneNumber.substring(0, 8) + '···' : 'N/A'}
          </p>
        </div>

        {/* Status */}
        <div className={`rounded-xl p-4 border transition-all ${
          isVerified 
            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
            : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${
            isVerified ? 'text-green-900' : 'text-yellow-900'
          }`}>
            {isVerified ? '✅ Status' : '⏳ Status'}
          </p>
          <p className={`text-sm font-bold mt-2 ${
            isVerified ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {isVerified ? 'Verified' : 'Pending'}
          </p>
        </div>
      </div>
    </div>
  );
}

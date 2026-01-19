import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, newWalletAddress } = await request.json();

    if (!phoneNumber || !newWalletAddress) {
      return NextResponse.json(
        { error: 'Phone number and new wallet address are required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!ethers.isAddress(newWalletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('62') || formattedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.RPC_URL || 'https://sepolia.base.org';
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!adminPrivateKey) {
      console.error('❌ [UpdateRegistration API] Missing ADMIN_PRIVATE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('📱 [UpdateRegistration API] Processing update for phone:', phoneNumber);

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
    const registry = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      adminSigner
    );

    // Hash phone number
    const phoneHash = hashPhoneNumber(formattedPhone);

    // Check if already registered
    const isRegistered = await registry.isRegistered(phoneHash);
    if (!isRegistered) {
      return NextResponse.json(
        { error: 'Phone number not registered. Please complete OTP verification first.' },
        { status: 400 }
      );
    }

    console.log('📝 [UpdateRegistration API] Updating registration with new address:', newWalletAddress);

    // Call updateRegistration on smart contract
    const tx = await registry.updateRegistration(phoneHash, newWalletAddress);
    console.log('⏳ [UpdateRegistration API] Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction failed to confirm');
    }

    console.log('✅ [UpdateRegistration API] Registration updated successfully');
    console.log('   Transaction hash:', receipt.hash);
    console.log('   Block number:', receipt.blockNumber);

    return NextResponse.json({
      success: true,
      message: 'Registration updated successfully',
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newWalletAddress: newWalletAddress,
    });
  } catch (err: any) {
    console.error('❌ [UpdateRegistration API] Error:', err.message);

    // Handle specific error cases
    if (err.message.includes('insufficient funds')) {
      return NextResponse.json(
        { error: 'Insufficient funds for transaction' },
        { status: 500 }
      );
    }

    if (err.message.includes('reverted')) {
      return NextResponse.json(
        { error: 'Smart contract call failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to update registration' },
      { status: 500 }
    );
  }
}

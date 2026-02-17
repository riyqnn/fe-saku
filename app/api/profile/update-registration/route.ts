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

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!adminPrivateKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

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

    // Call updateRegistration on smart contract
    const tx = await registry.updateRegistration(phoneHash, newWalletAddress);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction failed to confirm');
    }

    return NextResponse.json({
      success: true,
      message: 'Registration updated successfully',
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newWalletAddress: newWalletAddress,
    });
  } catch (err: any) {
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

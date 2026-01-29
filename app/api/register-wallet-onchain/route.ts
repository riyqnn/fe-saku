import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';

export async function POST(request: Request) {
  try {
    const { walletAddress, phoneNumber } = await request.json();

    if (!walletAddress || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing walletAddress or phoneNumber' },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Get provider (using backend RPC)
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
    );

    // Get signer from private key (admin wallet)
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error('ADMIN_PRIVATE_KEY not configured');
    }

    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

    // Create registry contract instance
    const registry = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      adminSigner
    );

    // Hash phone number
    const phoneHash = hashPhoneNumber(phoneNumber);

    // Check if already registered
    const alreadyRegistered = await registry.isRegistered(phoneHash);
    if (alreadyRegistered) {
      const existingAddress = await registry.getAccount(phoneHash);
      return NextResponse.json({
        success: true,
        message: 'Phone already registered',
        walletAddress: existingAddress,
        txHash: null,
        isNewRegistration: false,
      });
    }

    // Call register function on smart contract
    const tx = await registry.register(phoneHash, walletAddress);

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction failed - no receipt');
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet registered on blockchain successfully',
      walletAddress: walletAddress,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      isNewRegistration: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Blockchain registration failed',
        details: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}

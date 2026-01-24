import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export async function GET(req: Request) {
  try {
    // 1. Get qrHash from query params
    const { searchParams } = new URL(req.url);
    const qrHash = searchParams.get('qrHash');

    if (!qrHash) {
      return NextResponse.json({ error: 'Missing required parameter: qrHash' }, { status: 400 });
    }

    // 2. Setup provider (read-only, no wallet needed)
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');

    // 3. Setup contract instance (read-only)
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      provider
    );

    // 4. Get QR payment details
    const paymentDetails = await registryContract.getQRPayment(qrHash);

    // 5. Calculate if refundable (timestamp + 24h < now)
    const now = BigInt(Math.floor(Date.now() / 1000));
    const expiry = await registryContract.QR_PAYMENT_EXPIRY();
    const expiresAt = paymentDetails.timestamp + expiry;
    const canRefund = paymentDetails.exists && !paymentDetails.claimed && expiresAt < now;

    return NextResponse.json({
      success: true,
      payment: {
        merchantHash: paymentDetails.merchantHash,
        payer: paymentDetails.payer,
        amount: ethers.formatUnits(paymentDetails.amount, 6),
        timestamp: Number(paymentDetails.timestamp),
        claimed: paymentDetails.claimed,
        exists: paymentDetails.exists,
        canRefund,
        expiresAt: Number(expiresAt),
      },
    });

  } catch (error: any) {
    console.error('Get QR Payment Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to get QR payment details'
    }, { status: 500 });
  }
}

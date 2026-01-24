import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // 1. Check Auth Session (merchant must be authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Read request body
    const { phoneNumber, qrHash } = await req.json();

    if (!phoneNumber || !qrHash) {
      return NextResponse.json({ error: 'Missing required fields: phoneNumber, qrHash' }, { status: 400 });
    }

    // 3. Get merchant's profile with encrypted private key
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, encrypted_private_key, encryption_iv, auth_tag')
      .eq('phone_hash', phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (!profile.wallet_address) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 400 });
    }

    // 4. Decrypt private key server-side
    let privateKey: string;
    try {
      privateKey = decrypt(
        profile.encrypted_private_key,
        profile.encryption_iv,
        profile.auth_tag
      );
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return NextResponse.json({ error: 'Failed to decrypt private key' }, { status: 500 });
    }

    // 5. Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    // 6. Setup contract instance
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      wallet
    );

    // 7. Execute claim QR payment
    const tx = await registryContract.claimQRPayment(qrHash);
    const receipt = await tx.wait();

    // 8. Parse QRPaymentClaimed event for verification
    let claimedAmount = BigInt(0);
    let merchantHash = '';

    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = registryContract.interface.parseLog(log);
          if (parsed && parsed.name === 'QRPaymentClaimed') {
            claimedAmount = parsed.args.amount || BigInt(0);
            merchantHash = parsed.args.merchantHash || '';
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amount: ethers.formatUnits(claimedAmount, 6),
      merchantHash,
    });

  } catch (error: any) {
    console.error('Claim QR Payment Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to claim QR payment'
    }, { status: 500 });
  }
}

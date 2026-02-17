import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { validateAuth } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // 1. Validate JWT Token
    const auth = await validateAuth(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // 2. Read request body (phoneNumber now from JWT, not body)
    const { amount } = await req.json();
    const phoneNumber = auth.phone!; // From JWT token

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    // 3. Get user's profile with encrypted private key
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
      return NextResponse.json({ error: 'Failed to decrypt private key' }, { status: 500 });
    }

    // 5. Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 6. Setup contract instances
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      wallet
    );

    // Check if user is registered in the contract
    const isRegistered = await registryContract.isRegistered(phoneHash);

    if (!isRegistered) {
      const registerTx = await registryContract.register(phoneHash, wallet.address);
      const registerReceipt = await registerTx.wait();
    }

    const idrxContract = new ethers.Contract(
      CONTRACTS.IDRX_ADDRESS,
      IDRX_ABI,
      wallet
    );

    // 7. Check and handle approval if needed
    const amountBigInt = ethers.parseUnits(amount, 6);
    let allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);

    let approvalTxHash: string | undefined;

    if (allowance < amountBigInt) {
      // Approve unlimited
      const approveTx = await idrxContract.approve(
        CONTRACTS.REGISTRY_ADDRESS,
        ethers.MaxUint256
      );

      const approveReceipt = await approveTx.wait();
      approvalTxHash = approveReceipt?.hash;

      // Check if the approval transaction was successful
      if (approveReceipt?.status !== 1) {
        throw new Error('Approval transaction failed on-chain');
      }

      // Wait a bit for the state to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify the allowance was updated with retry logic
      let retries = 5;
      for (let i = 0; i < retries; i++) {
        allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);

        if (allowance >= amountBigInt) {
          break;
        }

        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Approval failed after ${retries} retries. Allowance is ${allowance.toString()}, need ${amountBigInt.toString()}`);
        }
      }
    }

    // 8. Execute topup
    const topupTx = await registryContract.topup(phoneHash, amountBigInt);
    const receipt = await topupTx.wait();

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      approvalTxHash,
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Topup failed'
    }, { status: 500 });
  }
}

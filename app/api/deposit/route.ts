import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // 1. Check Auth Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Read request body ONCE
    const { phoneNumber, amount } = await req.json();

    if (!phoneNumber || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      console.error('Decryption error:', decryptError);
      return NextResponse.json({ error: 'Failed to decrypt private key' }, { status: 500 });
    }

    // 5. Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    // 4. Setup contract instances
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      wallet
    );

    const idrxContract = new ethers.Contract(
      CONTRACTS.IDRX_ADDRESS,
      IDRX_ABI,
      wallet
    );

    // 5. Check and handle approval if needed
    const amountBigInt = ethers.parseUnits(amount, 6);
    let allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);

    console.log('[Deposit] Initial allowance:', allowance.toString());
    console.log('[Deposit] Amount to deposit:', amountBigInt.toString());

    let approvalTxHash: string | undefined;

    if (allowance < amountBigInt) {
      console.log('[Deposit] Approving unlimited...');

      // Approve unlimited
      const approveTx = await idrxContract.approve(
        CONTRACTS.REGISTRY_ADDRESS,
        ethers.MaxUint256
      );
      console.log('[Deposit] Approval tx hash:', approveTx.hash);
      console.log('[Deposit] Waiting for approval confirmation...');

      const approveReceipt = await approveTx.wait();
      approvalTxHash = approveReceipt?.hash;

      console.log('[Deposit] Approval confirmed, block:', approveReceipt?.blockNumber);
      console.log('[Deposit] Approval status:', approveReceipt?.status);

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
        console.log(`[Deposit] Check ${i + 1}/${retries}: New allowance after approval:`, allowance.toString());

        if (allowance >= amountBigInt) {
          console.log('[Deposit] ✓ Allowance verified successfully!');
          break;
        }

        if (i < retries - 1) {
          console.log('[Deposit] Allowance not updated yet, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Approval failed after ${retries} retries. Allowance is ${allowance.toString()}, need ${amountBigInt.toString()}`);
        }
      }
    }

    // 6. Execute deposit
    const depositTx = await registryContract.deposit(phoneHash, amountBigInt);
    const receipt = await depositTx.wait();

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      approvalTxHash,
    });

  } catch (error: any) {
    console.error('Deposit Error:', error);
    return NextResponse.json({
      error: error.message || 'Deposit failed'
    }, { status: 500 });
  }
}

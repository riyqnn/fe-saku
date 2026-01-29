import { createSakuServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1);
  return normalized;
}

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phoneNumber, toAddress, amount, withdrawAll } = await req.json();

    if (!phoneNumber || !toAddress) {
      return NextResponse.json({ error: 'Missing required fields: phoneNumber, toAddress' }, { status: 400 });
    }

    if (!amount && !withdrawAll) {
      return NextResponse.json({ error: 'Either amount or withdrawAll flag is required' }, { status: 400 });
    }

    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, encrypted_private_key, encryption_iv, auth_tag')
      .eq('phone_number', normalizedPhone)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (!profile.wallet_address) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 400 });
    }

    const phoneHash = hashPhoneNumber(normalizedPhone);

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

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      wallet
    );

    const isRegistered = await registryContract.isRegistered(phoneHash);

    if (!isRegistered) {
      const registerTx = await registryContract.register(phoneHash, wallet.address);
      await registerTx.wait();
    }

    const idrxContract = new ethers.Contract(
      CONTRACTS.IDRX_ADDRESS,
      IDRX_ABI,
      wallet
    );

    let amountBigInt = BigInt(0);

    if (withdrawAll) {
      const balance = await idrxContract.balanceOf(wallet.address);
      amountBigInt = balance;
    } else if (amount) {
      amountBigInt = ethers.parseUnits(amount, 6);
    }

    let approvalTxHash: string | undefined;

    if (amountBigInt > BigInt(0)) {
      const allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);

      if (allowance < amountBigInt) {
        const approveTx = await idrxContract.approve(
          CONTRACTS.REGISTRY_ADDRESS,
          ethers.MaxUint256
        );
        const approveReceipt = await approveTx.wait();
        approvalTxHash = approveReceipt?.hash;
      }
    }

    let receipt;
    if (withdrawAll) {
      const tx = await registryContract.withdrawAll(phoneHash, toAddress);
      receipt = await tx.wait();
    } else {
      const tx = await registryContract.withdraw(phoneHash, toAddress, amountBigInt);
      receipt = await tx.wait();
    }

    let withdrawnAmount = BigInt(0);
    let fee = BigInt(0);

    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = registryContract.interface.parseLog(log);
          if (parsed && parsed.name === 'Withdrawn') {
            withdrawnAmount = parsed.args.amount || BigInt(0);
            fee = parsed.args.fee || BigInt(0);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    const amountAfterFee = withdrawnAmount - fee;

    await supabaseAdmin
      .from('transactions')
      .insert({
        sender_phone: normalizedPhone,
        sender_wallet: wallet.address,
        receiver_phone: null,
        receiver_wallet: toAddress,
        amount: parseFloat(ethers.formatUnits(withdrawnAmount, 6)),
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: 'WITHDRAW',
        timestamp: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amount: ethers.formatUnits(withdrawnAmount, 6),
      fee: ethers.formatUnits(fee, 6),
      amountAfterFee: ethers.formatUnits(amountAfterFee, 6),
      approvalTxHash,
      type: 'WITHDRAW'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Withdrawal failed'
    }, { status: 500 });
  }
}
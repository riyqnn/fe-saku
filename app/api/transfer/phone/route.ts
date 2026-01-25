import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  return normalized;
}

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { phoneNumber, receiverPhone, amount } = await req.json();

    if (!phoneNumber || !receiverPhone || !amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const formattedSenderPhone = normalizePhone(phoneNumber);
    const formattedReceiverPhone = normalizePhone(receiverPhone);

    // 1. Cari Profil Pengirim
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('encrypted_private_key, encryption_iv, auth_tag')
      .eq('phone_number', formattedSenderPhone)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Sender wallet not found' }, { status: 401 });
    }

    // 2. Dekripsi Private Key
    const privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    // 3. Setup Contracts
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, wallet);
    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, wallet);

    // 4. Cek Penerima & Balance
    const receiverHash = hashPhoneNumber(formattedReceiverPhone);
    const amountBigInt = ethers.parseUnits(amount, 6); // Pastikan IDRX decimalnya 6

    const receiverAddress = await registryContract.getAccount(receiverHash);
    if (receiverAddress === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Penerima tidak terdaftar di Saku' }, { status: 400 });
    }

    const balance = await idrxContract.balanceOf(wallet.address);
    if (balance < amountBigInt) {
      return NextResponse.json({ error: 'Saldo IDRX tidak cukup' }, { status: 400 });
    }

    // 5. Just-in-Time Approval (Back-up jika auto-approve saat login gagal)
    const currentAllowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);
    if (currentAllowance < amountBigInt) {
      console.log('🔄 [Transfer API] Allowance kurang, melakukan auto-approve...');
      const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();
    }

    // 6. Eksekusi Transfer
    console.log('🚀 [Transfer API] Executing transferIDRX...');
    const tx = await registryContract.transferIDRX(receiverHash, amountBigInt);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      amount,
      receiver: formattedReceiverPhone
    });

  } catch (error: any) {
    console.error('❌ [Transfer API] Error:', error);
    return NextResponse.json({ error: error.message || 'Transfer gagal' }, { status: 500 });
  }
}
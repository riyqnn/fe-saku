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
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const formattedSenderPhone = normalizePhone(phoneNumber);
    const formattedReceiverPhone = normalizePhone(receiverPhone);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('encrypted_private_key, encryption_iv, auth_tag')
      .eq('phone_number', formattedSenderPhone)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Sender wallet not found' }, { status: 401 });
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org',
      undefined,
      { staticNetwork: true }
    );
    
    const privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    const wallet = new ethers.Wallet(privateKey, provider);

    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, wallet);
    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, wallet);

    const receiverHash = hashPhoneNumber(formattedReceiverPhone);
    const amountBigInt = ethers.parseUnits(amount, 6);

    const receiverAddress = await registryContract.getAccount(receiverHash);
    if (receiverAddress === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Penerima tidak terdaftar' }, { status: 400 });
    }

    let currentNonce = await provider.getTransactionCount(wallet.address, "pending");

    const currentAllowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);
    if (currentAllowance < amountBigInt) {
      console.log(`🔄 [Transfer API] Auto-approve dengan nonce: ${currentNonce}`);
      const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256, {
        nonce: currentNonce
      });
      await approveTx.wait();
      currentNonce++; // Naikkan nonce setelah approve
    }

    console.log(`🚀 [Transfer API] Executing transferIDRX dengan nonce: ${currentNonce}`);
    
    const txPromise = registryContract.transferIDRX(receiverHash, amountBigInt, {
      nonce: currentNonce
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 15000) // Timeout 15 detik
    );

    // Race antara transaksi blockchain dan timeout
    const tx = await Promise.race([txPromise, timeoutPromise]) as ethers.ContractTransactionResponse;
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error('Blockchain transaction failed');
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      amount,
      receiver: formattedReceiverPhone
    });

  } catch (error: any) {
    console.error('❌ [Transfer API] Error:', error);

    if (error.message === 'timeout' || error.message.includes('ETIMEDOUT')) {
      return NextResponse.json({ 
        error: "Koneksi blockchain lemot, transaksi mungkin sedang diproses di background. Cek riwayat beberapa saat lagi." 
      }, { status: 504 });
    }

    if (error.code === 'NONCE_EXPIRED') {
      return NextResponse.json({ error: "Transaksi tabrakan (nonce expired). Coba lagi ya bos." }, { status: 409 });
    }

    return NextResponse.json({ 
      error: error.message || 'Transfer gagal diproses' 
    }, { status: 500 });
  }
}
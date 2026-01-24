import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

// Helper to normalize phone number for consistent lookups
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
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Pastikan pakai Service Role Key
  );

  try {
    const { phoneNumber, receiverPhone, amount } = await req.json();

    if (!phoneNumber || !receiverPhone || !amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Normalisasi agar formatnya pasti '628...'
    const formattedSenderPhone = normalizePhone(phoneNumber);
    const formattedReceiverPhone = normalizePhone(receiverPhone);

    console.log(`💸 [Transfer API] Sender: ${formattedSenderPhone}`);

    // PERBAIKAN: Cari berdasarkan phone_number langsung, bukan phone_hash
    // Ini lebih akurat karena phone_hash bergantung pada library eksternal yang mungkin berbeda hasilnya
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_address, encrypted_private_key, encryption_iv, auth_tag')
      .eq('phone_number', formattedSenderPhone) // Cari pakai nomor HP bersih
      .single();

    if (profileError || !profile) {
      console.error('❌ [Transfer API] Profile tidak ditemukan untuk nomor:', formattedSenderPhone);
      return NextResponse.json({ error: 'Sender wallet not found' }, { status: 401 });
    }

    // 3. Decrypt private key server-side
    let privateKey: string;
    try {
      privateKey = decrypt(
        profile.encrypted_private_key,
        profile.encryption_iv,
        profile.auth_tag
      );
    } catch (decryptError) {
      console.error('❌ [Transfer API] Decryption error:', decryptError);
      return NextResponse.json({ error: 'Failed to access secure wallet' }, { status: 500 });
    }

    // 4. Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    // 5. Setup contract instances
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

    // 6. Check Receiver and Balance
    const receiverHash = hashPhoneNumber(formattedReceiverPhone);
    const amountBigInt = ethers.parseUnits(amount, 6); // Assuming IDRX uses 6 decimals

    // Check if receiver is registered on-chain
    const receiverAddress = await registryContract.getAccount(receiverHash);
    if (receiverAddress === ethers.ZeroAddress) {
      return NextResponse.json({
        error: `Receiver (${formattedReceiverPhone}) is not registered on Saku`
      }, { status: 400 });
    }

    // Check sender's IDRX balance
    const balance = await idrxContract.balanceOf(wallet.address);
    if (balance < amountBigInt) {
      return NextResponse.json({
        error: `Insufficient balance. Current: ${ethers.formatUnits(balance, 6)} IDRX`
      }, { status: 400 });
    }

    // 7. Handle Allowance/Approval
    let allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);
    if (allowance < amountBigInt) {
      console.log('🔓 [Transfer API] Approving IDRX for Registry...');
      const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();
    }

    // 8. Execute On-chain Transfer
    console.log('🚀 [Transfer API] Executing transferIDRX...');
    const tx = await registryContract.transferIDRX(receiverHash, amountBigInt);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error('Blockchain transaction failed');
    }

    console.log('✅ [Transfer API] Transfer successful:', receipt.hash);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      amount: amount,
      receiver: formattedReceiverPhone,
      gasUsed: receipt.gasUsed.toString()
    });

  } catch (error: any) {
    console.error('❌ [Transfer API] Global Error:', error);
    return NextResponse.json({
      error: error.message || 'Transfer failed to process'
    }, { status: 500 });
  }
}
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { hashPhoneNumber } from '@/utils/phoneHash'
import { decrypt } from '@/utils/encrypt'
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi'
import { CONTRACTS } from '@/lib/config'

const TX_TYPES = {
  TRANSFER: 'TRANSFER',
  TOPUP: 'TOPUP',
  WITHDRAW: 'WITHDRAW',
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '')
  if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1)
  return normalized
}

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  )

  try {
    const { phoneNumber, receiverPhone, amount } = await req.json()

    if (!phoneNumber || !receiverPhone || !amount) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    const senderPhone = normalizePhone(phoneNumber)
    const receiverPhoneNormalized = normalizePhone(receiverPhone)

    // Get both profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, encrypted_private_key, encryption_iv, auth_tag, wallet_address, phone_number')
      .in('phone_number', [senderPhone, receiverPhoneNormalized]);

    if (profilesError || !profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'Could not retrieve profiles' }, { status: 404 });
    }
    
    const senderProfile = profiles.find(p => p.phone_number === senderPhone);
    const receiverProfile = profiles.find(p => p.phone_number === receiverPhoneNormalized);

    if (!senderProfile) return NextResponse.json({ error: 'Sender wallet not found' }, { status: 401 });
    if (!receiverProfile) return NextResponse.json({ error: 'Receiver wallet not found' }, { status: 404 });

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
    const privateKey = decrypt(senderProfile.encrypted_private_key, senderProfile.encryption_iv, senderProfile.auth_tag)
    const wallet = new ethers.Wallet(privateKey, provider)

    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, wallet)
    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, wallet)

    const receiverAddress = receiverProfile.wallet_address;

    const safeAmount = parseFloat(amount).toFixed(6) 
    const amountBigInt = ethers.parseUnits(safeAmount, 6) 

    let nonce = await provider.getTransactionCount(wallet.address, 'latest')
    const allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS)
    
    if (allowance < amountBigInt) {
      const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256, { nonce })
      await approveTx.wait()
      nonce++ 
    }

    const tx = await registryContract.transferUSDC(hashPhoneNumber(receiverPhoneNormalized), amountBigInt, { nonce })
    const receipt = await tx.wait()

    if (!receipt || receipt.status !== 1) throw new Error('Blockchain transaction failed')

    // Insert transaction
    await supabaseAdmin.from('transactions').insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhoneNormalized,
        sender_wallet: wallet.address.toLowerCase(),
        receiver_wallet: receiverAddress.toLowerCase(),
        amount: parseFloat(amount),
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: TX_TYPES.TRANSFER,
        timestamp: new Date().toISOString()
      });

    // Create notifications
    const senderName = senderProfile.full_name || `User ...${senderPhone.slice(-4)}`;
    const receiverName = receiverProfile.full_name || `User ...${receiverPhoneNormalized.slice(-4)}`;

    await Promise.all([
      supabaseAdmin.from('notifications').insert({
        user_id: senderProfile.id,
        type: 'TRANSFER_OUT',
        message: `You sent ${amount} USDC to ${receiverName}.`,
        metadata: { amount: parseFloat(amount), tx_hash: receipt.hash, to_name: receiverName },
      }),
      supabaseAdmin.from('notifications').insert({
        user_id: receiverProfile.id,
        type: 'TRANSFER_IN',
        message: `You received ${amount} USDC from ${senderName}.`,
        metadata: { amount: parseFloat(amount), tx_hash: receipt.hash, from_name: senderName },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amount,
      receiver: receiverPhoneNormalized,
      type: TX_TYPES.TRANSFER
    });

  } catch (err: any) {
    console.error("Transfer Fatal Error:", err)
    return NextResponse.json({ error: err.message || 'Transfer failed' }, { status: 500 })
  }
}
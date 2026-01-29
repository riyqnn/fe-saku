import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { hashPhoneNumber } from '@/utils/phoneHash'
import { decrypt } from '@/utils/encrypt'
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi'
import { CONTRACTS } from '@/lib/config'

// Define Transaction Types agar konsisten
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
  // Gunakan Service Role Key untuk akses admin ke profiles & transactions
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  )

  try {
    const { phoneNumber, receiverPhone, amount } = await req.json()

    // Validasi input dasar
    if (!phoneNumber || !receiverPhone || !amount) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const senderPhone = normalizePhone(phoneNumber)
    const receiverPhoneNormalized = normalizePhone(receiverPhone)

    // 1. Ambil credentials Sender
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('encrypted_private_key, encryption_iv, auth_tag, wallet_address')
      .eq('phone_number', senderPhone)
      .single()

    if (profileError || !profile) {
      console.error('❌ Sender profile not found:', profileError)
      return NextResponse.json({ error: 'Wallet sender tidak ditemukan' }, { status: 401 })
    }

    // 2. Setup Ethers Provider & Wallet
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
    const privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag)
    const wallet = new ethers.Wallet(privateKey, provider)

    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, wallet)
    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, wallet)

    // 3. Pastikan Sender Terdaftar di Contract (Lazy Registration)
    const senderHash = hashPhoneNumber(senderPhone)
    const isSenderRegistered = await registryContract.isRegistered(senderHash)
    
    if (!isSenderRegistered) {
      console.log('Sender not registered. Auto-registering...')
      const registerTx = await registryContract.register(senderHash, wallet.address)
      await registerTx.wait()
      console.log('Sender registered.')
    }

    // 4. Cek Receiver di Contract
    const receiverHash = hashPhoneNumber(receiverPhoneNormalized)
    const amountBigInt = ethers.parseUnits(amount.toString(), 6) // Pastikan amount jadi string dulu

    const receiverAddress = await registryContract.getAccount(receiverHash)
    if (receiverAddress === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Penerima tidak terdaftar' }, { status: 400 })
    }

    // 5. Handle Allowance (Approve jika kurang)
    let nonce = await provider.getTransactionCount(wallet.address, 'pending')
    const allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS)
    
    if (allowance < amountBigInt) {
      console.log(`🔄 Approving IDRX...`)
      const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256, { nonce })
      await approveTx.wait()
      nonce++ // Increment nonce manual untuk tx berikutnya
    }

    // 6. Eksekusi Transfer Blockchain
    console.log(`🚀 Executing transferIDRX...`)
    const tx = await registryContract.transferIDRX(receiverHash, amountBigInt, { nonce })
    const receipt = await tx.wait()

    if (!receipt || receipt.status !== 1) throw new Error('Transaksi blockchain gagal')

    console.log('✅ Blockchain transaction successful:', receipt.hash)

    // 7. Simpan ke Database (Updated Schema)
    // Karena ini fitur TRANSFER, sender dan receiver phone diisi
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhoneNormalized,
        sender_wallet: wallet.address,
        receiver_wallet: receiverAddress,
        amount: parseFloat(amount),
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: TX_TYPES.TRANSFER, // Menggunakan tipe 'TRANSFER'
        timestamp: new Date().toISOString()
      })
      .select() // Select untuk memastikan data tersimpan dan dikembalikan

    if (txError) {
      // Note: Transaksi blockchain sudah sukses, tapi insert DB gagal. 
      // Idealnya perlu mekanisme retry atau logging ke monitoring system (Sentry/dll).
      console.error('❌ Supabase insert error:', txError)
    } else {
      console.log('✅ Transaction saved to DB')
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amount,
      receiver: receiverPhoneNormalized,
      type: TX_TYPES.TRANSFER
    })

  } catch (err: any) {
    console.error('❌ Transfer API error:', err)
    return NextResponse.json({ error: err.message || 'Transfer gagal' }, { status: 500 })
  }
}
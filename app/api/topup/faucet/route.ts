import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { createClient } from '@supabase/supabase-js' // Import Supabase

const IDRX_TOKEN_ADDRESS = "0x9c33242D93Bc4BCA866dFcB36FEeF81482383A56"
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology"

const TOKEN_ABI = [
  "function faucet(address to, uint256 amount) external",
  "function decimals() public view returns (uint8)"
]

export async function POST(request: NextRequest) {
  // 1. Setup Supabase Admin
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { walletAddress, amount } = body

    console.log('Top-up request received:', { walletAddress, amount })

    // Validation
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!PRIVATE_KEY) {
      console.error('ADMIN_PRIVATE_KEY not configured')
      return NextResponse.json({ error: 'Service config error' }, { status: 500 })
    }

    // 2. Lookup Receiver Profile (Cari no HP user berdasarkan wallet address)
    // Ini penting agar history topup muncul di user
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .eq('wallet_address', walletAddress) // asumsi di table profiles case-sensitive, pastikan walletAddress konsisten
      .single()
    
    // Note: Jika user tidak ketemu (misal wallet luar), receiverPhone tetap null, 
    // tapi transaksi blockchain tetap lanjut.
    const receiverPhone = userProfile ? userProfile.phone_number : null;

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const signer = new ethers.Wallet(PRIVATE_KEY, provider)

    // Connect to token contract
    const tokenContract = new ethers.Contract(IDRX_TOKEN_ADDRESS, TOKEN_ABI, signer)

    // Get token decimals & Convert
    const decimals = await tokenContract.decimals()
    const amountInWei = ethers.parseUnits(amount.toString(), decimals)

    console.log(`Processing top-up: ${amount} IDRX to ${walletAddress}`)

    // 3. Execute Blockchain Transaction
    const tx = await tokenContract.faucet(walletAddress, amountInWei)
    console.log(`Transaction sent: ${tx.hash}`)

    // Wait for transaction confirmation
    const receipt = await tx.wait()
    console.log(`Transaction confirmed: ${receipt.hash}`)

    // 4. Insert ke Database Supabase
    const { error: dbError } = await supabaseAdmin
      .from('transactions')
      .insert({
        sender_phone: null,             // Kosong karena dari System/Admin
        sender_wallet: signer.address,  // Wallet Admin
        receiver_phone: receiverPhone,  // No HP User (hasil lookup tadi)
        receiver_wallet: walletAddress, // Wallet User
        amount: parseFloat(amount),
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: 'TOPUP',                  // Tipe Transaksi
        timestamp: new Date().toISOString()
      })

    if (dbError) {
      // Kita log error saja, jangan throw error karena uang sudah masuk di blockchain
      console.error('⚠️ Transaction success on Blockchain but failed to save to DB:', dbError)
    } else {
      console.log('✅ Top Up transaction saved to DB')
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      amount: amount,
      walletAddress: walletAddress,
      receiverPhone: receiverPhone
    })

  } catch (error: any) {
    console.error('Top-up error:', error)
    
    // Error Handling standar (sama seperti sebelumnya)
    let errorMessage = 'Failed to process top up'
    if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Smart contract call failed.'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient gas funds in admin wallet.'
    }

    return NextResponse.json(
      { error: errorMessage, details: error.toString() },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'IDRX Top-up API',
    endpoint: '/api/topup/faucet',
    method: 'POST',
    tokenAddress: IDRX_TOKEN_ADDRESS
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { createClient } from '@supabase/supabase-js'

const IDRX_TOKEN_ADDRESS = "0x9c33242D93Bc4BCA866dFcB36FEeF81482383A56"
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology"

const TOKEN_ABI = [
  "function faucet(address to, uint256 amount) external",
  "function decimals() public view returns (uint8)"
]

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { walletAddress, amount } = body

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!PRIVATE_KEY) {
      return NextResponse.json({ error: 'Service config error' }, { status: 500 })
    }

    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .eq('wallet_address', walletAddress)
      .single()
    
    const receiverPhone = userProfile ? userProfile.phone_number : null

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const signer = new ethers.Wallet(PRIVATE_KEY, provider)
    const tokenContract = new ethers.Contract(IDRX_TOKEN_ADDRESS, TOKEN_ABI, signer)

    const decimals = await tokenContract.decimals()
    const amountInWei = ethers.parseUnits(amount.toString(), decimals)

    const tx = await tokenContract.faucet(walletAddress, amountInWei)
    const receipt = await tx.wait()

    await supabaseAdmin
      .from('transactions')
      .insert({
        sender_phone: null,
        sender_wallet: signer.address,
        receiver_phone: receiverPhone,
        receiver_wallet: walletAddress,
        amount: parseFloat(amount),
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: 'TOPUP',
        timestamp: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      amount: amount,
      walletAddress: walletAddress,
      receiverPhone: receiverPhone
    })

  } catch (error: any) {
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
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const IDRX_TOKEN_ADDRESS = "0x9c33242D93Bc4BCA866dFcB36FEeF81482383A56"
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology"

const TOKEN_ABI = [
  "function faucet(address to, uint256 amount) external",
  "function decimals() public view returns (uint8)"
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, amount } = body

    console.log('Top-up request received:', { walletAddress, amount })

    // Validation
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!PRIVATE_KEY) {
      console.error('ADMIN_PRIVATE_KEY not configured')
      return NextResponse.json(
        { error: 'Service not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const signer = new ethers.Wallet(PRIVATE_KEY, provider)

    // Connect to token contract
    const tokenContract = new ethers.Contract(
      IDRX_TOKEN_ADDRESS,
      TOKEN_ABI,
      signer
    )

    // Get token decimals
    const decimals = await tokenContract.decimals()

    // Convert amount to token units
    const amountInWei = ethers.parseUnits(amount.toString(), decimals)

    console.log(`Processing top-up: ${amount} IDRX to ${walletAddress}`)

    // Mint tokens to user's wallet using faucet function
    const tx = await tokenContract.faucet(walletAddress, amountInWei)

    console.log(`Transaction sent: ${tx.hash}`)

    // Wait for transaction confirmation
    const receipt = await tx.wait()

    console.log(`Transaction confirmed: ${receipt.hash}`)

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      amount: amount,
      walletAddress: walletAddress
    })

  } catch (error: any) {
    console.error('Top-up error:', error)

    let errorMessage = 'Failed to process top up'

    if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Smart contract call failed. Please check if admin has faucet permissions.'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient gas funds in admin wallet.'
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please try again.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'IDRX Top-up API',
    endpoint: '/api/topup/faucet',
    method: 'POST',
    tokenAddress: IDRX_TOKEN_ADDRESS,
    rpcUrl: RPC_URL,
    configured: !!process.env.ADMIN_PRIVATE_KEY
  })
}

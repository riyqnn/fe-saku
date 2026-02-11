// File: app/api/topup/faucet/route.ts
// Pastikan struktur folder: app/api/topup/faucet/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const IDRX_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_IDRX_ADDRESS || "0x4aA676740f4b28925Dc9b11cD4642b2AEa57c424"
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY // Admin wallet private key
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology"

// ERC20 Token ABI - minimal untuk mint function
const TOKEN_ABI = [
  "function mint(address to, uint256 amount) public",
  "function decimals() public view returns (uint8)"
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, amount } = body

    // Validation
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (!PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Faucet not configured. Please contact administrator.' },
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

    // Convert amount to token units (with decimals)
    const amountInWei = ethers.parseUnits(amount.toString(), decimals)

    // Mint tokens to user's wallet
    const tx = await tokenContract.mint(walletAddress, amountInWei)

    // Wait for transaction confirmation
    const receipt = await tx.wait()

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      amount: amount,
      walletAddress: walletAddress
    })

  } catch (error: any) {
    // Better error messages
    let errorMessage = 'Failed to process top up'
    
    if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Contract call failed. Check if faucet wallet has minting permissions.'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Faucet wallet has insufficient gas. Please add MATIC/ETH to faucet wallet.'
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please check RPC URL configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.code,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// Optional: GET method untuk testing
export async function GET() {
  return NextResponse.json({
    message: 'IDRX Faucet API',
    endpoint: '/api/topup/faucet',
    method: 'POST',
    tokenAddress: IDRX_TOKEN_ADDRESS,
    rpcUrl: RPC_URL,
    configured: !!process.env.FAUCET_PRIVATE_KEY
  })
}
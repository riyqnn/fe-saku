import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";

/**
 * POST /api/transfer
 * Transfer IDRX tokens to another wallet address
 * 
 * Body:
 * - senderAddress: address of the sender
 * - receiverAddress: address of the receiver
 * - amount: amount to transfer (in IDRX units)
 * - privateKey: encrypted private key (decoded on frontend)
 * - transactionHash: optional, for logging purposes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderAddress, receiverAddress, amount, privateKey } = body;

    // Validate inputs
    if (!senderAddress || !receiverAddress || !amount || !privateKey) {
      return NextResponse.json(
        { error: "Missing required fields: senderAddress, receiverAddress, amount, privateKey" },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(senderAddress) || !ethers.isAddress(receiverAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet addresses" },
        { status: 400 }
      );
    }

    if (senderAddress.toLowerCase() === receiverAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot transfer to the same address" },
        { status: 400 }
      );
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Verify sender address matches signer
    if (signer.address.toLowerCase() !== senderAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Private key does not match sender address" },
        { status: 401 }
      );
    }

    // Parse amount
    const transferAmount = toTokenAmount(amount, IDRX_DECIMALS);

    // Create IDRX token contract instance
    const idrxContract = new ethers.Contract(
      CONTRACTS.IDRX_ADDRESS,
      IDRX_ABI,
      signer
    );

    // Check balance
    const balance = await idrxContract.balanceOf(senderAddress);
    if (balance < transferAmount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Execute transfer
    const tx = await idrxContract.transfer(receiverAddress, transferAmount);
    const receipt = await tx.wait();

    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction failed" },
        { status: 500 }
      );
    }

    // Get registry contract to emit transfer event
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      signer
    );

    // Note: Registry contract will automatically emit Transferred event when listening to blockchain
    // but we don't need to call it again since the ERC20 transfer already happened

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      from: signer.address,
      to: receiverAddress,
      amount: amount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Transfer error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Transfer failed: ${message}` },
      { status: 500 }
    );
  }
}

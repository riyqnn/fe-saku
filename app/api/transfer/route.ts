import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";

/**
 * POST /api/transfer
 * Transfer IDRX tokens to another wallet address
 *
 * Body:
 * - phoneNumber: sender's phone number (for authentication)
 * - receiverAddress: address of the receiver
 * - amount: amount to transfer (in IDRX units)
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth session
    const supabase = await createSakuServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber, receiverAddress, amount } = body;

    // Validate inputs
    if (!phoneNumber || !receiverAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, receiverAddress, amount" },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(receiverAddress)) {
      return NextResponse.json(
        { error: "Invalid receiver address" },
        { status: 400 }
      );
    }

    // Get sender's profile with encrypted private key
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address, encrypted_private_key, encryption_iv, auth_tag")
      .eq("phone_hash", phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Sender wallet not found" },
        { status: 404 }
      );
    }

    if (!profile.wallet_address) {
      return NextResponse.json(
        { error: "Sender wallet address not found" },
        { status: 400 }
      );
    }

    if (profile.wallet_address.toLowerCase() === receiverAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot transfer to the same address" },
        { status: 400 }
      );
    }

    // Decrypt private key server-side
    let privateKey: string;
    try {
      privateKey = decrypt(
        profile.encrypted_private_key,
        profile.encryption_iv,
        profile.auth_tag
      );
    } catch (decryptError) {
      console.error("Decryption error:", decryptError);
      return NextResponse.json(
        { error: "Failed to decrypt private key" },
        { status: 500 }
      );
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Verify sender address matches profile
    if (signer.address.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      return NextResponse.json(
        { error: "Private key does not match wallet address" },
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
    const balance = await idrxContract.balanceOf(profile.wallet_address);
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

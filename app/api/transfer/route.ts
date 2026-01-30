import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

/**
 * POST /api/transfer
 * Transfer IDRX tokens to another wallet address or phone number
 *
 * Body:
 * - receiverAddress: address of the receiver (optional if receiverPhone provided)
 * - receiverPhone: phone number of the receiver (optional if receiverAddress provided)
 * - amount: amount to transfer (in IDRX units)
 *
 * Authentication: Bearer token from JWT (phone number extracted from token)
 */
export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    // Validate JWT Token
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { receiverAddress, receiverPhone, amount } = body;
    const phoneNumber = auth.phone!; // From JWT token

    // Validate amount
    if (!amount) {
      return NextResponse.json(
        { error: "Missing required field: amount" },
        { status: 400 }
      );
    }

    // Determine receiver address (either from direct input or phone lookup)
    let finalReceiverAddress = receiverAddress;

    if (receiverPhone && !receiverAddress) {
      // Look up wallet address from phone number
      const receiverPhoneHash = hashPhoneNumber(receiverPhone);
      const { data: receiverProfile, error: receiverError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("phone_hash", receiverPhoneHash)
        .single();

      if (receiverError || !receiverProfile?.wallet_address) {
        return NextResponse.json(
          { error: "Receiver wallet not found" },
          { status: 404 }
        );
      }

      finalReceiverAddress = receiverProfile.wallet_address;
    }

    if (!finalReceiverAddress) {
      return NextResponse.json(
        { error: "Missing receiverAddress or receiverPhone" },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(finalReceiverAddress)) {
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

    if (profile.wallet_address.toLowerCase() === finalReceiverAddress.toLowerCase()) {
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
    const tx = await idrxContract.transfer(finalReceiverAddress, transferAmount);
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
      to: finalReceiverAddress,
      amount: amount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Transfer failed: ${message}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

// Amplop expiry is now 1 day (86400 seconds) in the simplified contract
const AMPLOP_EXPIRY_SECONDS = 24 * 60 * 60; // 1 day

/**
 * POST /api/packet/create
 * Create a new packet (shareable red envelope) using simplified Amplop contract
 *
 * Body:
 * - packetCode: string (unique shareable code)
 * - senderName: string (optional, stored in DB only)
 * - message: string (optional, stored in DB only)
 * - totalAmount: number (total IDRX to distribute)
 * - maxWinners: number (max people who can claim, 1-500)
 * - distributionType: "EQUAL" | "RANDOM" (stored in DB only)
 */
export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    // Validate JWT Token
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { packetCode, senderName, message, totalAmount, maxWinners, distributionType } = body;
    const phoneNumber = auth.phone!;

    // Validations
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!maxWinners || maxWinners < 1 || maxWinners > 500) {
      return NextResponse.json({ error: "Max winners must be between 1 and 500" }, { status: 400 });
    }

    if (!distributionType || !["EQUAL", "RANDOM"].includes(distributionType)) {
      return NextResponse.json({ error: "Invalid distribution type" }, { status: 400 });
    }

    // Generate display code if not provided
    const displayCode = packetCode || generateRandomCode(8);

    // Generate amplopId (bytes32) from packetCode using keccak256
    const amplopId = ethers.keccak256(ethers.toUtf8Bytes(displayCode));

    // Get user's profile
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address, encrypted_private_key, encryption_iv, auth_tag")
      .eq("phone_hash", phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Decrypt private key
    let privateKey: string;
    try {
      privateKey = decrypt(
        profile.encrypted_private_key,
        profile.encryption_iv,
        profile.auth_tag
      );
    } catch (decryptError) {
      return NextResponse.json({ error: "Failed to decrypt private key" }, { status: 500 });
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Verify signer address matches profile
    if (signer.address.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      return NextResponse.json({ error: "Private key does not match wallet address" }, { status: 401 });
    }

    // Create contract instances
    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, signer);
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer);

    // Convert amount to token units
    const tokenAmount = toTokenAmount(totalAmount.toString(), IDRX_DECIMALS);

    // Check balance
    const balance = await idrxContract.balanceOf(profile.wallet_address);
    if (balance < tokenAmount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Approve IDRX spending
    const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, tokenAmount);
    await approveTx.wait();

    // Create amplop on blockchain using simplified createAmplop(id, maxWinners, amount)
    const tx = await registryContract.createAmplop(amplopId, maxWinners, tokenAmount);
    const receipt = await tx.wait();

    // Calculate expiry (1 day from now)
    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = createdAt + AMPLOP_EXPIRY_SECONDS;

    // Save to database (includes off-chain data: senderName, message, distributionType)
    const { error: insertError } = await supabase
      .from("packets")
      .insert([
        {
          packet_code: displayCode,
          packet_code_hash: amplopId,
          creator_phone_hash: phoneHash,
          creator_wallet_address: profile.wallet_address,
          sender_name: senderName || null,
          message: message || null,
          total_amount: totalAmount,
          remaining_amount: totalAmount,
          max_winners: maxWinners,
          winner_count: 0,
          distribution_type: distributionType,
          status: "ACTIVE",
          contract_tx_hash: receipt.hash,
          contract_expires_at: new Date(expiresAt * 1000).toISOString(),
        },
      ]);

    if (insertError) {
      console.error("Failed to save packet to database:", insertError);
    }

    const origin = request.nextUrl.origin;

    return NextResponse.json({
      success: true,
      packetCode: displayCode,
      amplopId,
      transactionHash: receipt.hash,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      shareLink: `${origin}/packet/claim/${displayCode}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create packet: ${message}` }, { status: 500 });
  }
}

/**
 * Generate a random alphanumeric code
 */
function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI } from "@/lib/abi";
import { toTokenAmount, fromTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

/**
 * POST /api/packet/claim
 * Claim a packet using the amplopId (packet_code_hash from database)
 *
 * Body:
 * - packetCode: string (the display code, used to look up amplopId)
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
    const { packetCode } = body;
    const phoneNumber = auth.phone!;

    if (!packetCode) {
      return NextResponse.json({ error: "Packet code is required" }, { status: 400 });
    }

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

    // Get packet from database
    const { data: packet, error: packetError } = await supabase
      .from("packets")
      .select("*")
      .eq("packet_code", packetCode.toUpperCase())
      .single();

    if (packetError || !packet) {
      return NextResponse.json({ error: "Packet not found" }, { status: 404 });
    }

    const amplopId = packet.packet_code_hash;

    // Check if already claimed (from database, not contract)
    const { data: existingClaim } = await supabase
      .from("packet_claims")
      .select("id")
      .eq("packet_code_hash", amplopId)
      .eq("claimer_wallet_address", profile.wallet_address)
      .single();

    if (existingClaim) {
      return NextResponse.json({ error: "You have already claimed this packet" }, { status: 400 });
    }

    // Check if packet is expired
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = Math.floor(new Date(packet.contract_expires_at).getTime() / 1000);
    if (now > expiryTime) {
      return NextResponse.json({ error: "This packet has expired" }, { status: 400 });
    }

    // Check if packet is fully claimed
    if (packet.winner_count >= packet.max_winners || packet.remaining_amount <= 0) {
      return NextResponse.json({ error: "This packet has been fully claimed" }, { status: 400 });
    }

    // Calculate claim amount OFF-CHAIN based on distribution type
    const claimAmount = calculateClaimAmount(
      packet.distribution_type,
      packet.remaining_amount,
      packet.max_winners - packet.winner_count
    );

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

    // Create contract instance
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      signer
    );

    // Convert claim amount to token units
    const claimAmountToken = toTokenAmount(claimAmount.toString(), IDRX_DECIMALS);

    // Claim amplop on blockchain with calculated amount
    const tx = await registryContract.claimAmplop(amplopId, claimAmountToken);
    const receipt = await tx.wait();

    // Save claim to database
    await supabase.from("packet_claims").insert([
      {
        packet_id: packet.id,
        packet_code_hash: amplopId,
        claimer_phone_hash: phoneHash,
        claimer_wallet_address: profile.wallet_address,
        claimed_amount: claimAmount,
        contract_tx_hash: receipt.hash,
      },
    ]);

    // Update packet in database
    const newWinnerCount = packet.winner_count + 1;
    const newRemainingAmount = packet.remaining_amount - claimAmount;
    const newStatus = newWinnerCount >= packet.max_winners || newRemainingAmount <= 0 ? "CLAIMED" : "ACTIVE";

    await supabase
      .from("packets")
      .update({
        winner_count: newWinnerCount,
        remaining_amount: newRemainingAmount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", packet.id);

    return NextResponse.json({
      success: true,
      claimedAmount: claimAmount.toString(),
      transactionHash: receipt.hash,
      packetCode,
      amplopId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to claim packet: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Calculate claim amount based on distribution type (OFF-CHAIN)
 */
function calculateClaimAmount(
  distributionType: string,
  remainingAmount: number,
  remainingWinners: number
): number {
  if (remainingWinners <= 0 || remainingAmount <= 0) {
    return 0;
  }

  if (distributionType === "EQUAL") {
    // EQUAL: Each claimer gets the same amount
    return Math.floor(remainingAmount / remainingWinners);
  } else {
    // RANDOM: Each claimer gets a random amount
    // Ensure minimum 1 and leave enough for remaining winners
    const minAmount = 1;
    const maxAmount = Math.max(minAmount, remainingAmount - (remainingWinners - 1) * minAmount);

    if (maxAmount <= minAmount) {
      return minAmount;
    }

    return Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  }
}

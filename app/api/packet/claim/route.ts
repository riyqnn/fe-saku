import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

/**
 * POST /api/packet/claim
 * Claim a packet using the amplopId (packet_code_hash from database)
 *
 * Body:
 * - packetCode: string (the display code, used to look up amplopId)
 * - amplopId: string (optional, the actual amplopId from blockchain)
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
    const { packetCode, amplopId: providedAmplopId } = body;
    const phoneNumber = auth.phone!;

    if (!packetCode && !providedAmplopId) {
      return NextResponse.json(
        { error: "Packet code or amplopId is required" },
        { status: 400 }
      );
    }

    // Get user's profile
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address, encrypted_private_key, encryption_iv, auth_tag")
      .eq("phone_hash", phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Get packet from database to find the amplopId
    let amplopId = providedAmplopId;
    let packet: any = null;

    if (packetCode && !amplopId) {
      const { data: packetData, error: packetError } = await supabase
        .from("packets")
        .select("*")
        .eq("packet_code", packetCode.toUpperCase())
        .single();

      if (packetError || !packetData) {
        return NextResponse.json(
          { error: "Packet not found" },
          { status: 404 }
        );
      }
      packet = packetData;
      amplopId = packet.packet_code_hash;
    }

    if (!amplopId) {
      return NextResponse.json(
        { error: "Could not find packet" },
        { status: 404 }
      );
    }

    // Check if already claimed
    const { data: existingClaim } = await supabase
      .from("packet_claims")
      .select("id")
      .eq("packet_code_hash", amplopId)
      .eq("claimer_wallet_address", profile.wallet_address)
      .single();

    if (existingClaim) {
      return NextResponse.json(
        { error: "You have already claimed this packet" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Failed to decrypt private key" },
        { status: 500 }
      );
    }

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Verify signer address matches profile
    if (signer.address.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      return NextResponse.json(
        { error: "Private key does not match wallet address" },
        { status: 401 }
      );
    }

    // Create contract instance
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      signer
    );

    // Check if already claimed on blockchain
    const hasClaimed = await registryContract.amplopHasClaimed(amplopId, profile.wallet_address);
    if (hasClaimed) {
      return NextResponse.json(
        { error: "Already claimed this packet" },
        { status: 400 }
      );
    }

    // Claim amplop on blockchain
    const tx = await registryContract.claimAmplop(amplopId);
    const receipt = await tx.wait();

    // Extract claimed amount from event
    let claimedAmount = BigInt(0);
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = registryContract.interface.parseLog(log);
          if (parsed && parsed.name === "AmplopClaimed") {
            claimedAmount = parsed.args.amount;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    const claimedAmountFormatted = fromTokenAmount(claimedAmount, IDRX_DECIMALS);

    // Save claim to database
    if (packet) {
      await supabase.from("packet_claims").insert([
        {
          packet_id: packet.id,
          packet_code_hash: amplopId,
          claimer_phone_hash: phoneHash,
          claimer_wallet_address: profile.wallet_address,
          claimed_amount: parseFloat(claimedAmountFormatted),
          contract_tx_hash: receipt.hash,
        },
      ]);

      // Update packet in database
      const newWinnerCount = (packet.winner_count || 0) + 1;
      const newRemainingAmount = (packet.remaining_amount || packet.total_amount) - parseFloat(claimedAmountFormatted);
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
    }

    return NextResponse.json({
      success: true,
      claimedAmount: claimedAmountFormatted,
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

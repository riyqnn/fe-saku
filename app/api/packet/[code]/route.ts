import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";

/**
 * GET /api/packet/[code]
 * Get packet information by code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const supabase = await createSakuServerClient();

  try {
    const packetCode = params.code?.toUpperCase();

    if (!packetCode) {
      return NextResponse.json(
        { error: "Packet code is required" },
        { status: 400 }
      );
    }

    // Try to get packet from database first
    const { data: packet, error: packetError } = await supabase
      .from("packets")
      .select("*")
      .eq("packet_code", packetCode)
      .single();

    // If not in database, return error (we need the amplopId from database)
    if (packetError || !packet) {
      return NextResponse.json(
        { error: "Packet not found" },
        { status: 404 }
      );
    }

    const amplopId = packet.packet_code_hash;

    // Get fresh data from blockchain
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      provider
    );

    // Get amplop data from blockchain
    const amplopData = await registryContract.getAmplop(amplopId);

    // Check if current user has claimed
    let hasClaimed = false;
    const auth = await validateAuth(request);
    if (auth.valid && auth.phone) {
      const phoneHash = hashPhoneNumber(auth.phone);
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("phone_hash", phoneHash)
        .single();

      if (profile) {
        hasClaimed = await registryContract.hasClaimedAmplop(amplopId, profile.wallet_address);
      }
    }

    // Get remaining info
    const [remaining, remainingWinners] = await registryContract.getAmplopRemaining(amplopId);

    // Get claimers from database
    const { data: claims } = await supabase
      .from("packet_claims")
      .select("claimer_wallet_address, claimed_amount, created_at")
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: true });

    // Calculate status
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = Number(amplopData.expiry);
    const isExpired = now > expiryTime;
    const isFullyClaimed = Number(amplopData.claimedCount) >= Number(amplopData.maxWinners) || remaining <= 0;

    let status = "ACTIVE";
    if (isExpired) status = "EXPIRED";
    else if (isFullyClaimed) status = "CLAIMED";

    return NextResponse.json({
      success: true,
      packet: {
        packetCode,
        amplopId,
        creator: amplopData.creator,
        senderName: amplopData.senderName,
        message: amplopData.message,
        totalAmount: fromTokenAmount(amplopData.totalAmount, IDRX_DECIMALS),
        remainingAmount: fromTokenAmount(remaining, IDRX_DECIMALS),
        maxWinners: Number(amplopData.maxWinners),
        winnerCount: Number(amplopData.claimedCount),
        distributionType: Number(amplopData.distType) === 0 ? "EQUAL" : "RANDOM",
        status,
        createdAt: new Date(Number(amplopData.createdAt) * 1000).toISOString(),
        expiresAt: new Date(expiryTime * 1000).toISOString(),
        exists: amplopData.exists,
        hasClaimed,
        remainingWinners: Number(remainingWinners),
        claims: claims || [],
        source: "blockchain",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get packet: ${message}` },
      { status: 500 }
    );
  }
}

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
  { params }: { params: any }
) {
  const supabase = await createSakuServerClient();

  // Handle params for various Next.js versions
  const resolvedParams = await params;
  const codeFromUrl = resolvedParams?.code;

  if (!codeFromUrl) {
    return NextResponse.json({ error: "Packet code is required" }, { status: 400 });
  }

  const packetCode = codeFromUrl.trim().toUpperCase();

  try {
    // 1. Get from Database
    const { data: packet, error: packetError } = await supabase
      .from("packets")
      .select("*")
      .eq("packet_code", packetCode)
      .single();

    if (packetError || !packet) {
      return NextResponse.json({ error: `Packet "${packetCode}" not found` }, { status: 404 });
    }

    // 2. Connect to Blockchain
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      provider
    );

    const amplopId = packet.packet_code_hash;

    // 3. Get on-chain data (simplified - only essential data)
    const amplopData = await registryContract.getAmplop(amplopId);

    if (!amplopData.exists) {
      return NextResponse.json({ error: "Packet not found on blockchain" }, { status: 404 });
    }

    // 4. Check if user has claimed (from DATABASE, not contract)
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
        const { data: claimRecord } = await supabase
          .from("packet_claims")
          .select("id")
          .eq("packet_code_hash", amplopId)
          .eq("claimer_wallet_address", profile.wallet_address)
          .single();
        hasClaimed = !!claimRecord;
      }
    }

    // 5. Get claims from database
    const { data: claims } = await supabase
      .from("packet_claims")
      .select("claimer_wallet_address, claimed_amount, created_at")
      .eq("packet_id", packet.id)
      .order("created_at", { ascending: true });

    // 6. Calculate remaining amount from blockchain data
    const onChainTotal = fromTokenAmount(amplopData.totalAmount, IDRX_DECIMALS);
    const onChainClaimed = fromTokenAmount(amplopData.totalClaimed, IDRX_DECIMALS);
    const remainingAmount = (parseFloat(onChainTotal) - parseFloat(onChainClaimed)).toString();

    // 7. Calculate status
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = Math.floor(new Date(packet.contract_expires_at).getTime() / 1000);
    const isExpired = now > expiryTime;
    const isFullyClaimed = Number(amplopData.claimedCount) >= Number(amplopData.maxWinners) || parseFloat(remainingAmount) <= 0;

    let status = "ACTIVE";
    if (isExpired) status = "EXPIRED";
    else if (isFullyClaimed) status = "CLAIMED";

    return NextResponse.json({
      success: true,
      packet: {
        packetCode,
        amplopId,
        creator: amplopData.creator,
        senderName: packet.sender_name,
        message: packet.message,
        totalAmount: onChainTotal,
        remainingAmount,
        maxWinners: Number(amplopData.maxWinners),
        winnerCount: Number(amplopData.claimedCount),
        distributionType: packet.distribution_type,
        status,
        createdAt: new Date(Number(amplopData.createdAt) * 1000).toISOString(),
        expiresAt: packet.contract_expires_at,
        exists: amplopData.exists,
        hasClaimed,
        remainingWinners: Number(amplopData.maxWinners) - Number(amplopData.claimedCount),
        claims: claims || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";

export async function GET(
  request: NextRequest,
  { params }: { params: any } // Gunakan any untuk fleksibilitas versi Next.js
) {
  const supabase = await createSakuServerClient();
  
  // Penanganan params untuk berbagai versi Next.js
  const resolvedParams = await params; 
  const codeFromUrl = resolvedParams?.code;

  if (!codeFromUrl) {
    return NextResponse.json(
      { error: "Packet code is required in the URL path." },
      { status: 400 }
    );
  }

  const packetCode = codeFromUrl.trim().toUpperCase();

  try {
    // 1. Cari di Database
    const { data: packet, error: packetError } = await supabase
      .from("packets")
      .select("*")
      .eq("packet_code", packetCode)
      .single();

    if (packetError || !packet) {
      return NextResponse.json(
        { error: `Packet "${packetCode}" tidak ditemukan.` },
        { status: 404 }
      );
    }

    // 2. Koneksi Blockchain
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      provider
    );

    const amplopId = packet.packet_code_hash;

    // 3. Ambil data On-chain
    const [amplopData, remainingInfo] = await Promise.all([
      registryContract.getAmplop(amplopId),
      registryContract.getAmplopRemaining(amplopId)
    ]);

    if (!amplopData.exists) {
      return NextResponse.json(
        { error: "Hash packet tidak valid di blockchain." },
        { status: 404 }
      );
    }

    // 4. Cek Klaim (Auth optional)
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

    return NextResponse.json({
      success: true,
      packet: {
        packetCode,
        amplopId,
        creator: amplopData.creator,
        senderName: amplopData.senderName,
        message: amplopData.message,
        totalAmount: fromTokenAmount(amplopData.totalAmount, IDRX_DECIMALS),
        remainingAmount: fromTokenAmount(remainingInfo[0], IDRX_DECIMALS),
        maxWinners: Number(amplopData.maxWinners),
        winnerCount: Number(amplopData.claimedCount),
        distributionType: Number(amplopData.distType) === 0 ? "EQUAL" : "RANDOM",
        status: Number(amplopData.claimedCount) >= Number(amplopData.maxWinners) ? "CLAIMED" : "ACTIVE",
        createdAt: new Date(Number(amplopData.createdAt) * 1000).toISOString(),
        expiresAt: new Date(Number(amplopData.expiry) * 1000).toISOString(),
        hasClaimed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";

export async function GET(request: NextRequest, { params }: { params: any }) {
  const supabase = await createSakuServerClient();
  const { code } = await params;
  const packetCode = code.toUpperCase();

  try {
    // 1. Ambil data lengkap dari Database (Metadata utama ada di sini sekarang)
    const { data: packet, error: dbError } = await supabase
      .from("packets").select("*").eq("packet_code", packetCode).single();

    if (dbError || !packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2. Tarik sisa saldo Real-time dari Blockchain
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, provider);

    // Kontrak baru mengembalikan uint256 langsung untuk getAmplopRemaining
    const remainingOnChain = await registryContract.getAmplopRemaining(packet.packet_code_hash);
    
    // 3. Cek Status Klaim User
    let hasClaimed = false;
    const auth = await validateAuth(request);
    if (auth.valid && auth.phone) {
      const { data: profile } = await supabase.from("profiles")
        .select("wallet_address").eq("phone_hash", hashPhoneNumber(auth.phone)).single();
      
      if (profile) {
          // Kita cek history klaim di DB saja agar lebih cepat & hemat RPC
          const { data: claim } = await supabase.from("packet_claims")
            .select("id").eq("packet_code_hash", packet.packet_code_hash)
            .eq("claimer_wallet_address", profile.wallet_address).single();
          hasClaimed = !!claim;
      }
    }

    return NextResponse.json({
      success: true,
      packet: {
        packetCode,
        totalAmount: packet.total_amount,
        remainingAmount: fromTokenAmount(remainingOnChain, IDRX_DECIMALS),
        maxWinners: packet.max_winners,
        winnerCount: packet.winner_count,
        distributionType: packet.distribution_type,
        status: packet.status,
        expiresAt: packet.contract_expires_at,
        themeId: packet.design_id, // <-- ADD THIS LINE
        hasClaimed
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
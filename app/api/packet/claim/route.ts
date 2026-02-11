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
// ... (import tetap sama)

export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

    const { packetCode } = await request.json();
    const phoneNumber = auth.phone!;

    // 1. Ambil Profile & Packet dari DB
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { data: profile } = await supabase.from("profiles").select("*").eq("phone_hash", phoneHash).single();
    const { data: packet } = await supabase.from("packets").select("*").eq("packet_code", packetCode?.toUpperCase()).single();

    if (!packet) return NextResponse.json({ error: "Packet not found" }, { status: 404 });

    // 2. Cek apakah sudah pernah klaim di DB
    const { data: existing } = await supabase.from("packet_claims")
      .select("id").eq("packet_code_hash", packet.packet_code_hash)
      .eq("claimer_wallet_address", profile.wallet_address).single();
    if (existing) return NextResponse.json({ error: "Sudah pernah klaim" }, { status: 400 });

    // 3. Kalkulasi Jumlah Klaim (OFF-CHAIN)
    const claimAmount = calculateClaimAmount(
      packet.distribution_type,
      packet.remaining_amount,
      packet.max_winners - packet.winner_count
    );

    if (claimAmount <= 0) return NextResponse.json({ error: "Packet habis" }, { status: 400 });

    // 4. On-Chain Transaction
    const privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    const signer = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl));
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer);

    const tokenAmount = toTokenAmount(claimAmount.toString(), IDRX_DECIMALS);

    // SESUAI KONTRAK BARU: claimAmplop(id, amount)
    const tx = await registryContract.claimAmplop(packet.packet_code_hash, tokenAmount);
    const receipt = await tx.wait();

    // 5. Update Database
    await supabase.from("packet_claims").insert([{
      packet_id: packet.id,
      packet_code_hash: packet.packet_code_hash,
      claimer_phone_hash: phoneHash,
      claimer_wallet_address: profile.wallet_address,
      claimed_amount: claimAmount,
      contract_tx_hash: receipt.hash,
    }]);

    const newWinnerCount = packet.winner_count + 1;
    const newRemaining = packet.remaining_amount - claimAmount;

    await supabase.from("packets").update({
      winner_count: newWinnerCount,
      remaining_amount: newRemaining,
      status: newWinnerCount >= packet.max_winners ? "CLAIMED" : "ACTIVE"
    }).eq("id", packet.id);

    return NextResponse.json({ success: true, claimedAmount: claimAmount, transactionHash: receipt.hash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Fungsi kalkulasi tetap sama seperti logic kamu sebelumnya
function calculateClaimAmount(type: string, remaining: number, left: number): number {
  if (left <= 0 || remaining <= 0) return 0;
  if (left === 1) return remaining; // Pemenang terakhir ambil sisa
  if (type === "EQUAL") return Math.floor(remaining / left);
  
  // Random logic: min 1, max rata-rata * 2
  const min = 1;
  const avg = remaining / left;
  const max = Math.min(remaining - (left - 1), Math.floor(avg * 2));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
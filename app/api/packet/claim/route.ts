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
    const auth = await validateAuth(request);
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

    const { packetCode } = await request.json();
    const phoneNumber = auth.phone!;
    const claimerPhoneHash = hashPhoneNumber(phoneNumber);

    // 1. Ambil Profile & Packet data
    const { data: profile } = await supabase.from("profiles").select("*").eq("phone_hash", claimerPhoneHash).single();
    const { data: packet } = await supabase.from("packets").select("*").eq("packet_code", packetCode?.toUpperCase()).single();

    if (!packet) return NextResponse.json({ error: "Packet not found" }, { status: 404 });
    if (packet.status !== "ACTIVE") return NextResponse.json({ error: "Packet is no longer active" }, { status: 400 });

    // 2. VALIDASI PRIVATE CIRCLE (Fitur Baru)
    if (packet.restricted_to && packet.restricted_to.length > 0) {
      if (!packet.restricted_to.includes(claimerPhoneHash)) {
        return NextResponse.json({ 
          error: "Private Packet: You are not invited to this circle!" 
        }, { status: 403 });
      }
    }

    // 3. Cek Double Claim
    const { data: existing } = await supabase.from("packet_claims")
      .select("id").eq("packet_id", packet.id)
      .eq("claimer_phone_hash", claimerPhoneHash).single();
    
    if (existing) return NextResponse.json({ error: "You've already claimed this packet" }, { status: 400 });

    // 4. Kalkulasi Amount (OFF-CHAIN)
    const claimAmount = calculateClaimAmount(
      packet.distribution_type,
      packet.remaining_amount,
      packet.max_winners - packet.winner_count
    );

    if (claimAmount <= 0) return NextResponse.json({ error: "Packet is empty" }, { status: 400 });

    // 5. On-Chain Transaction
    const privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer);

    const tokenAmount = toTokenAmount(claimAmount.toString(), IDRX_DECIMALS);

    // Execute claim on blockchain
    const tx = await registryContract.claimAmplop(packet.packet_code_hash, tokenAmount);
    const receipt = await tx.wait();

    // 6. Update Database (Atomic-ish)
    // Catat claim
    await supabase.from("packet_claims").insert([{
      packet_id: packet.id,
      packet_code_hash: packet.packet_code_hash,
      claimer_phone_hash: claimerPhoneHash,
      claimer_wallet_address: profile.wallet_address,
      claimed_amount: claimAmount,
      contract_tx_hash: receipt.hash,
    }]);

    // Catat history transaksi wallet
    await supabase.from("transactions").insert([{
      receiver_phone: phoneNumber,
      receiver_wallet: profile.wallet_address,
      amount: claimAmount,
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      type: "PACKET_CLAIM",
      reference_id: packet.id,
      timestamp: new Date().toISOString(),
    }]);

    // Update status packet
    const newWinnerCount = packet.winner_count + 1;
    const newRemaining = packet.remaining_amount - claimAmount;

    await supabase.from("packets").update({
      winner_count: newWinnerCount,
      remaining_amount: newRemaining,
      status: newWinnerCount >= packet.max_winners ? "CLAIMED" : "ACTIVE"
    }).eq("id", packet.id);

    return NextResponse.json({ 
      success: true, 
      claimedAmount: claimAmount, 
      transactionHash: receipt.hash 
    });

  } catch (error: any) {
    console.error("CLAIM ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateClaimAmount(type: string, remaining: number, left: number): number {
  if (left <= 0 || remaining <= 0) return 0;
  if (left === 1) return remaining;
  if (type === "EQUAL") return parseFloat((remaining / left).toFixed(2));
  
  // Random logic for USDC (pake desimal biar ga cuma 1 USDC)
  const min = 0.01;
  const avg = remaining / left;
  const max = Math.min(remaining - (left * 0.01), avg * 2);
  const random = Math.random() * (max - min) + min;
  return parseFloat(random.toFixed(2));
}
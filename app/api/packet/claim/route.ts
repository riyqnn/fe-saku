import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

    const { packetCode } = await request.json();
    const phoneNumber = auth.phone!;
    const claimerPhoneHash = hashPhoneNumber(phoneNumber);

    const { data: profile } = await supabase.from("profiles").select("*").eq("phone_hash", claimerPhoneHash).single();
    const { data: packet } = await supabase.from("packets").select("*").eq("packet_code", packetCode?.toUpperCase()).single();

    if (!packet) return NextResponse.json({ error: "Box not found" }, { status: 404 });
    if (packet.status !== "ACTIVE") return NextResponse.json({ error: "Box is no longer active" }, { status: 400 });

    if (packet.restricted_to && !packet.restricted_to.includes(claimerPhoneHash)) {
      return NextResponse.json({ error: "Private Circle: You are not invited!" }, { status: 403 });
    }

    const { data: existing } = await supabase.from("packet_claims").select("id")
      .eq("packet_id", packet.id).eq("claimer_phone_hash", claimerPhoneHash).single();
    if (existing) return NextResponse.json({ error: "Already claimed!" }, { status: 400 });

    const privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer);

    // 1. Ambil data asli Blockchain (SATUAN BIGINT)
    const exists = await registryContract.amplopExists(packet.packet_code_hash);
    if (!exists) return NextResponse.json({ error: "Box not found on-chain" }, { status: 404 });

    const totalAmt = await registryContract.amplopTotalAmounts(packet.packet_code_hash);
    const claimedAmt = await registryContract.amplopClaimedAmounts(packet.packet_code_hash);
    const remainingOnChainBigInt = totalAmt - claimedAmt;
    
    // Convert ke number buat kalkulasi logic
    const remainingOnChain = Number(ethers.formatUnits(remainingOnChainBigInt, IDRX_DECIMALS));

    if (remainingOnChainBigInt <= BigInt(0)) {
      return NextResponse.json({ error: "Blockchain: Box is empty" }, { status: 400 });
    }

    // 2. Kalkulasi Amount dengan safety check
    const winnersLeft = packet.max_winners - packet.winner_count;
    let claimAmount = calculateClaimAmount(
      packet.distribution_type,
      remainingOnChain,
      winnersLeft
    );

    // Mencegah claimAmount > sisa (Safety rounding)
    if (claimAmount > remainingOnChain) claimAmount = remainingOnChain;

    // Convert balik ke BigInt untuk kirim ke kontrak
    const tokenAmount = toTokenAmount(claimAmount.toString(), IDRX_DECIMALS);

    // 3. Last chance check: Kalau ternyata tokenAmount masih > remainingOnChainBigInt gara-gara string conversion
    const finalTokenAmount = tokenAmount > remainingOnChainBigInt ? remainingOnChainBigInt : tokenAmount;

    // 4. Pre-Execution (Cek Gas)
    const ethBalance = await provider.getBalance(signer.address);
    if (ethBalance < ethers.parseEther("0.0001")) {
      return NextResponse.json({ error: "No ETH for gas fees. Claim failed." }, { status: 400 });
    }

    // 5. Execute On-Chain
    try {
      // Gunakan finalTokenAmount yang sudah pasti aman
      const tx = await registryContract.claimAmplop(packet.packet_code_hash, finalTokenAmount);
      const receipt = await tx.wait();

      // 6. Atomic Database Update (RPC)
      // Pakai claimAmount original buat DB (biar balance sinkron)
      const { error: rpcError } = await supabase.rpc('claim_packet_atomic', {
        target_packet_id: packet.id,
        amount_to_claim: claimAmount
      });

      if (rpcError) console.error("RPC Warning (Possible race condition):", rpcError);

      // 7. Insert History
      await supabase.from("packet_claims").insert([{
        packet_id: packet.id,
        packet_code_hash: packet.packet_code_hash,
        claimer_phone_hash: claimerPhoneHash,
        claimer_wallet_address: profile.wallet_address,
        claimed_amount: claimAmount,
        contract_tx_hash: receipt.hash,
      }]);

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

      return NextResponse.json({ success: true, claimedAmount: claimAmount, transactionHash: receipt.hash });

    } catch (blockchainErr: any) {
      console.error("CONTRACT REVERT DETAIL:", blockchainErr);
      return NextResponse.json({ error: "Blockchain Rejected: " + (blockchainErr.reason || "Invalid Amount or Already Claimed On-chain") }, { status: 400 });
    }

  } catch (error: any) {
    console.error("FATAL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateClaimAmount(type: string, remaining: number, left: number): number {
  if (left <= 0 || remaining <= 0) return 0;
  if (left === 1) return parseFloat(remaining.toFixed(2));
  if (type === "EQUAL") return parseFloat((remaining / left).toFixed(2));
  
  const min = 0.01;
  const avg = remaining / left;
  const max = Math.min(remaining - (left * 0.01), avg * 2);
  const random = Math.random() * (max - min) + min;
  return parseFloat(random.toFixed(2));
}
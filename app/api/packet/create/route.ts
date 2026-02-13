import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

    const body = await request.json();
    // Tambahkan targetPhones dari body
    const { packetCode, totalAmount, maxWinners, distributionType, targetPhones, themeId } = body;
    const phoneNumber = auth.phone!;

    // 1. Validasi Input
    if (!totalAmount || totalAmount <= 0) return NextResponse.json({ error: "Amount invalid" }, { status: 400 });
    if (!maxWinners || maxWinners < 1 || maxWinners > 500) return NextResponse.json({ error: "Max winners 1-500" }, { status: 400 });

    // Generate Code otomatis
    const displayCode = packetCode || Math.random().toString(36).substring(2, 10).toUpperCase();
    const amplopId = ethers.keccak256(ethers.toUtf8Bytes(displayCode));

    // 2. Ambil Profile & Decrypt Private Key
    const phoneHash = hashPhoneNumber(phoneNumber);
    
    // Proses targetPhones jika ada (Private Mode)
    let restrictedToHashes = null;
    if (targetPhones && Array.isArray(targetPhones) && targetPhones.length > 0) {
      restrictedToHashes = targetPhones.map(phone => hashPhoneNumber(phone));
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, wallet_address, encrypted_private_key, encryption_iv, auth_tag")
      .eq("phone_hash", phoneHash)
      .single();

    if (profileError || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, signer);
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, signer);

    const tokenAmount = toTokenAmount(totalAmount.toString(), IDRX_DECIMALS);

    const currentAllowance = await idrxContract.allowance(profile.wallet_address, CONTRACTS.REGISTRY_ADDRESS);
    if (currentAllowance < tokenAmount) {
      const approveTx = await idrxContract.approve(CONTRACTS.REGISTRY_ADDRESS, tokenAmount);
      await approveTx.wait();
    }

    const tx = await registryContract.createAmplop(amplopId, maxWinners, tokenAmount);
    const receipt = await tx.wait();

    const { data: newPacket, error: insertError } = await supabase
      .from("packets")
      .insert([{
        packet_code: displayCode,
        packet_code_hash: amplopId,
        creator_phone_hash: phoneHash,
        creator_wallet_address: profile.wallet_address,
        total_amount: totalAmount,
        remaining_amount: totalAmount,
        max_winners: maxWinners,
        winner_count: 0,
        distribution_type: distributionType || "RANDOM",
        status: "ACTIVE",
        contract_tx_hash: receipt.hash,
        design_id: themeId || 'orange',
        restricted_to: restrictedToHashes,
        contract_expires_at: new Date(Date.now() + 86400000).toISOString(),
      }])
      .select("id")
      .single();
      
    if (insertError) console.error("DATABASE INSERT ERROR:", insertError);

    await supabase.from("transactions").insert([{
        sender_phone: phoneNumber,
        sender_wallet: profile.wallet_address,
        amount: totalAmount,
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: "PACKET_CREATE",
        reference_id: newPacket?.id,
        timestamp: new Date().toISOString(),
      }]);

    // Create notification for the creator
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'TRANSFER_OUT',
      message: `You created a packet of ${totalAmount} USDC.`,
      metadata: {
        amount: totalAmount,
        tx_hash: receipt.hash,
        packet_code: displayCode,
      },
    });
      
    const origin = request.nextUrl.origin;

    return NextResponse.json({
      success: true,
      packetCode: displayCode,
      amplopId,
      transactionHash: receipt.hash,
      shareLink: `${origin}/packet/claim/${displayCode}`,
    });
  } catch (error: any) {
    console.error("CREATE PACKET FATAL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

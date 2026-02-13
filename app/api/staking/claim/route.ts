import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { USDC_STAKING_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { createSakuServerClient } from "@/lib/supabaseServer";

/**
 * POST /api/staking/claim
 * Claim pending staking rewards
 */
export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const phoneHash = hashPhoneNumber(auth.phone!);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, wallet_address, encrypted_private_key, encryption_iv, auth_tag")
      .eq("phone_hash", phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Decrypt private key
    let privateKey: string;
    try {
      privateKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    } catch (e) {
      return NextResponse.json({ error: "Failed to decrypt private key" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    if (signer.address.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 401 });
    }

    const stakingContract = new ethers.Contract(CONTRACTS.USDC_STAKING!, USDC_STAKING_ABI, signer);

    // Check pending rewards
    const pendingRewards = await stakingContract.getPendingRewards(profile.wallet_address);
    if (pendingRewards <= 0) {
      return NextResponse.json({ error: "No rewards to claim" }, { status: 400 });
    }

    // Claim rewards
    const tx = await stakingContract.claimRewards();
    const receipt = await tx.wait();

    // Extract claimed amount from event
    let claimedAmount = BigInt(0);
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = stakingContract.interface.parseLog(log);
          if (parsed && parsed.name === "RewardsClaimed") {
            claimedAmount = parsed.args.amount;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    const claimedAmountFormatted = fromTokenAmount(claimedAmount, IDRX_DECIMALS);

    // Add notification
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await supabaseAdmin.from('notifications').insert({
      user_id: profile.id,
      type: 'CLAIM_SUCCESS',
      message: `Successfully claimed ${claimedAmountFormatted} USDC in rewards.`,
      metadata: {
        amount: claimedAmountFormatted,
        tx_hash: receipt.hash,
      },
    });

    return NextResponse.json({
      success: true,
      claimedAmount: claimedAmountFormatted,
      transactionHash: receipt.hash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to claim rewards: ${message}` }, { status: 500 });
  }
}

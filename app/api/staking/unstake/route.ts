import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { USDC_STAKING_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { createSakuServerClient } from "@/lib/supabaseServer";

/**
 * POST /api/staking/unstake
 * Unstake stUSDC to receive USDC back
 *
 * Body:
 * - shares: string (number of shares to unstake, or "all" to unstake everything)
 */
export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { shares } = body;

    if (!shares) {
      return NextResponse.json({ error: "Shares amount is required" }, { status: 400 });
    }

    const phoneHash = hashPhoneNumber(auth.phone!);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address, encrypted_private_key, encryption_iv, auth_tag")
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

    // Determine shares to unstake
    let sharesToUnstake: bigint;
    if (shares === "all") {
      sharesToUnstake = await stakingContract.sharesOf(profile.wallet_address);
    } else {
      sharesToUnstake = BigInt(shares);
    }

    if (sharesToUnstake <= 0) {
      return NextResponse.json({ error: "No shares to unstake" }, { status: 400 });
    }

    // Unstake
    const tx = await stakingContract.unstake(sharesToUnstake);
    const receipt = await tx.wait();

    // Extract amount from event
    let amountReceived = BigInt(0);
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = stakingContract.interface.parseLog(log);
          if (parsed && parsed.name === "Unstaked") {
            amountReceived = parsed.args.amount;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sharesUnstaked: sharesToUnstake.toString(),
      amountReceived: fromTokenAmount(amountReceived, IDRX_DECIMALS),
      transactionHash: receipt.hash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to unstake: ${message}` }, { status: 500 });
  }
}

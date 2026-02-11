import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { USDC_STAKING_ABI, ST_USDC_ABI } from "@/lib/abi";
import { fromTokenAmount } from "@/lib/blockchain";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { createSakuServerClient } from "@/lib/supabaseServer";

/**
 * GET /api/staking/info
 * Get staking information for the authenticated user
 */
export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const phoneHash = hashPhoneNumber(auth.phone!);
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("phone_hash", phoneHash)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const stakingContract = new ethers.Contract(
      CONTRACTS.USDC_STAKING!,
      USDC_STAKING_ABI,
      provider
    );

    // Get staking info
    const [totalStaked, totalShares, userBalance, userShares, pendingRewards, exchangeRate, minStake] =
      await Promise.all([
        stakingContract.totalStaked(),
        stakingContract.totalShares(),
        stakingContract.balanceOf(profile.wallet_address),
        stakingContract.sharesOf(profile.wallet_address),
        stakingContract.pendingRewards(profile.wallet_address),
        stakingContract.getCurrentExchangeRate(),
        stakingContract.MIN_STAKE_AMOUNT(),
      ]);

    return NextResponse.json({
      success: true,
      staking: {
        totalStaked: fromTokenAmount(totalStaked, IDRX_DECIMALS),
        totalShares: totalShares.toString(),
        userStaked: fromTokenAmount(userBalance, IDRX_DECIMALS),
        userShares: userShares.toString(),
        pendingRewards: fromTokenAmount(pendingRewards, IDRX_DECIMALS),
        exchangeRate: exchangeRate.toString(),
        minStakeAmount: fromTokenAmount(minStake, IDRX_DECIMALS),
        walletAddress: profile.wallet_address,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get staking info: ${message}` }, { status: 500 });
  }
}

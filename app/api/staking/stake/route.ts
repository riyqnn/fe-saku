import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { USDC_STAKING_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount, fromTokenAmount } from "@/lib/blockchain";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { createSakuServerClient } from "@/lib/supabaseServer";

/**
 * POST /api/staking/stake
 * Stake USDC to receive stUSDC
 *
 * Body:
 * - amount: number (amount of USDC to stake, minimum 1 USDC)
 */
export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Minimum stake amount is 1 USDC" }, { status: 400 });
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

    const usdcContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, signer);
    const stakingContract = new ethers.Contract(CONTRACTS.USDC_STAKING!, USDC_STAKING_ABI, signer);

    const stakeAmount = toTokenAmount(amount.toString(), IDRX_DECIMALS);

    // Check balance
    const balance = await usdcContract.balanceOf(profile.wallet_address);
    if (balance < stakeAmount) {
      return NextResponse.json({ error: "Insufficient USDC balance" }, { status: 400 });
    }

    // Approve USDC spending
    const approveTx = await usdcContract.approve(CONTRACTS.USDC_STAKING!, stakeAmount);
    await approveTx.wait();

    // Stake USDC
    const tx = await stakingContract.stake(stakeAmount);
    const receipt = await tx.wait();

    // Extract amount from event (1:1 ratio, so stUSDC = USDC staked)
    let stakedAmount = BigInt(0);
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = stakingContract.interface.parseLog(log);
          if (parsed && parsed.name === "Staked") {
            stakedAmount = parsed.args.amount;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    const finalStakedAmount = fromTokenAmount(stakedAmount, IDRX_DECIMALS);

    // Add notification
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await supabaseAdmin.from('notifications').insert({
      user_id: profile.id,
      type: 'STAKE_SUCCESS',
      message: `Successfully staked ${amount} USDC.`,
      metadata: {
        amount: amount,
        stUSDCReceived: finalStakedAmount,
        tx_hash: receipt.hash,
      },
    });

    return NextResponse.json({
      success: true,
      stakedAmount: amount,
      stUSDCReceived: finalStakedAmount,
      transactionHash: receipt.hash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to stake: ${message}` }, { status: 500 });
  }
}

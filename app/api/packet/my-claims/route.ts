import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";

/**
 * GET /api/packet/my-claims
 * Get all packets claimed by the current user
 */
export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const phoneHash = hashPhoneNumber(auth.phone!);

    // Get user's wallet address
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("phone_hash", phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const { data: claims, error } = await supabase
      .from("packet_claims")
      .select(`
        id,
        packet_id,
        packet_code_hash,
        claimer_wallet_address,
        claimed_amount,
        contract_tx_hash,
        created_at,
        packets (
          packet_code,
          distribution_type,
          creator_wallet_address,
          total_amount,
          max_winners
        )
      `)
      .eq("claimer_wallet_address", profile.wallet_address)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      claims: claims || [],
      totalClaimed: (claims || []).reduce((sum, claim) => sum + (claim.claimed_amount || 0), 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get claims: ${message}` },
      { status: 500 }
    );
  }
}

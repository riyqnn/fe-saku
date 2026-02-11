import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";

/**
 * GET /api/packet/my-packets
 * Get all packets created by the current user
 */
export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const phoneHash = hashPhoneNumber(auth.phone!);

    const { data: packets, error } = await supabase
      .from("packets")
      .select(`
        id,
        packet_code,
        packet_code_hash,
        creator_wallet_address,
        total_amount,
        remaining_amount,
        max_winners,
        winner_count,
        distribution_type,
        status,
        contract_tx_hash,
        contract_expires_at,
        created_at
      `)
      .eq("creator_phone_hash", phoneHash)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get claim counts for each packet
    const packetsWithClaimCounts = await Promise.all(
      (packets || []).map(async (packet) => {
        const { count } = await supabase
          .from("packet_claims")
          .select("*", { count: "exact", head: true })
          .eq("packet_id", packet.id);

        return {
          ...packet,
          claimCount: count || 0,
          shareLink: `${origin}/packet/claim/${packet.packet_code}`,
          isExpired: new Date(packet.contract_expires_at) < new Date(),
          isFullyClaimed: packet.winner_count >= packet.max_winners || packet.remaining_amount <= 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      packets: packetsWithClaimCounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get packets: ${message}` },
      { status: 500 }
    );
  }
}

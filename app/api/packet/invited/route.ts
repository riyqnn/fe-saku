import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";

export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();
  const auth = await validateAuth(request);
  
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

  const phoneHash = hashPhoneNumber(auth.phone!);

  const { data: claimedData } = await supabase
    .from("packet_claims")
    .select("packet_id")
    .eq("claimer_phone_hash", phoneHash);

  const claimedIds = claimedData?.map(c => c.packet_id) || [];

  let query = supabase
    .from("packets")
    .select(`
      *,
      creator:profiles!packets_creator_phone_hash_fkey (
        full_name,
        avatar_url
      )
    `)
    .filter("restricted_to", "cs", `{"${phoneHash}"}`)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (claimedIds.length > 0) {
    query = query.not("id", "in", `(${claimedIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch Invited Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ packets: data || [] });
}
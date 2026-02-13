import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";

export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();
  const auth = await validateAuth(request);
  
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

  const phoneHash = hashPhoneNumber(auth.phone!);

  // Gunakan filter 'cs' (contains) untuk array di Supabase
  const { data, error } = await supabase
  .from("packets")
  .select(`
    *,
    creator:profiles!packets_creator_phone_hash_fkey (
      full_name,
      avatar_url
    )
  `) // Kita join ke tabel profiles pake fkey creator_phone_hash
  .filter("restricted_to", "cs", `{"${phoneHash}"}`)
  .eq("status", "ACTIVE")
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Invited Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Debug log di server console buat mastiin data keluar
  console.log(`Found ${data?.length} invited packets for ${auth.phone}`);

  return NextResponse.json({ packets: data || [] });
}
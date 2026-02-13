import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";
import { hashPhoneNumber } from "@/utils/phoneHash";

export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();
  const auth = await validateAuth(request);
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });

  const phoneHash = hashPhoneNumber(auth.phone!);

  const { data, error } = await supabase
    .from("packets")
    .select("*")
    .contains("restricted_to", [phoneHash]) // Cek apakah hash user ada di array
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ packets: data });
}
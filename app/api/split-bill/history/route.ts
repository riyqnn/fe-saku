import { NextRequest, NextResponse } from "next/server";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { validateAuth } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const creatorPhone = auth.phone!;

    const { data, error } = await supabase
      .from("split_bills")
      .select("*")
      .eq("creator_id", creatorPhone)
      .order("created_at", { ascending: false }); 

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
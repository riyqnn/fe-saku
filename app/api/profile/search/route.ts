// app/api/profile/search/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: { fetch: (...args) => fetch(...args) },
  }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
      return NextResponse.json({ success: true, profiles: [] });
    }

    const { data: profiles, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone_number, wallet_address')
      .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(5);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to retrieve profiles' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      profiles: profiles || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server connection error' }, { status: 500 });
  }
}
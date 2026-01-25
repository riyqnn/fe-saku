import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Tambahkan konfigurasi fetch global untuk menghindari "fetch failed"
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (...args) => fetch(...args),
    },
  }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
      return NextResponse.json({ success: true, profiles: [] });
    }

    // Mencari di tabel profiles berdasarkan nama atau nomor HP
    const { data: profiles, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone_number, wallet_address')
      .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(5);

    if (dbError) {
      console.error('❌ Database Search Error:', dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      profiles: profiles || []
    });
  } catch (error: any) {
    console.error('❌ [Profile Search API] Global Error:', error.message);
    
    // Memberikan pesan yang lebih deskriptif jika fetch failed tetap terjadi
    const isFetchError = error.message.includes('fetch');
    return NextResponse.json({ 
      error: isFetchError ? "Database connection failed (Fetch Error)" : error.message 
    }, { status: 500 });
  }
}
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inisialisasi Admin Client dengan fix untuk fetch failed di Node.js
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (...args) => fetch(...args),
    },
  }
);

/**
 * Helper: Ambil User ID berdasarkan nomor HP pengirim di header
 */
async function getSakuUserId(req: Request) {
  const phone = req.headers.get('x-saku-phone');
  if (!phone) return null;

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone_number', phone)
    .single();

  if (error || !profile) return null;
  return profile.id;
}

// --- GET: List Semua Kontak ---
export async function GET(req: Request) {
  try {
    const userId = await getSakuUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, contacts: contacts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- POST: Simpan Kontak Baru (Auto-Name Lookup) ---
export async function POST(req: Request) {
  try {
    const userId = await getSakuUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name: inputName, phone_number } = await req.json();

    if (!phone_number) {
      return NextResponse.json({ error: 'Nomor HP wajib ada' }, { status: 400 });
    }

    // 1. Cek Duplikat Kontak di daftar user
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('phone_number', phone_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Kontak ini udah ada di daftar lo' }, { status: 400 });
    }

    // 2. LOGIC PINTAR: Cari Profile di Saku
    // Kita lookup ke tabel profiles buat nyari Full Name & Wallet asli
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, wallet_address')
      .eq('phone_number', phone_number)
      .maybeSingle();

    /**
     * Penentuan Nama Kontak:
     * 1. Pakai full_name dari database Saku (biar resmi)
     * 2. Kalau nggak ada, pakai name yang dikirim frontend
     * 3. Kalau nggak ada juga, baru pakai phone_number
     */
    const finalName = targetProfile?.full_name || inputName || phone_number;
    const wallet_address = targetProfile?.wallet_address || null;

    // 3. Simpan ke database
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .insert([{
        user_id: userId,
        name: finalName,
        phone_number,
        wallet_address,
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Kontak ${finalName} disimpan`,
      contact 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
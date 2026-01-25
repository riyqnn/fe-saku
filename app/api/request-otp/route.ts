// app/api/request-otp/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/utils/encrypt'; 

function normalizePhoneForFonnte(phone: string): string {
  let normalized = phone.replace(/\D/g, ''); 
  if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1);
  return normalized;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    // Validasi Env (Cegah fetch failed ke Supabase)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Config Supabase di .env belum bener bos!');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const formattedPhone = normalizePhoneForFonnte(phone);
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 
    const encryptedOTP = encrypt(otpCode);

    // 1. Simpan ke DB (Pastikan ini selesai dulu)
    const { error: dbError } = await supabaseAdmin
      .from('otp_verifications')
      .insert([{ 
        phone_number: formattedPhone, 
        otp_code: encryptedOTP.encryptedData,
        encryption_iv: encryptedOTP.iv,      
        auth_tag: encryptedOTP.authTag,       
        expired_at: expiresAt.toISOString(),
        is_used: false 
      }]);

    if (dbError) throw new Error(`Database Error: ${dbError.message}`);

    // 2. Kirim via Fonnte (Gunakan timeout agar tidak ETIMEDOUT selamanya)
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10 detik

    const fonnteResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': process.env.FONNTE_TOKEN || '' },
      body: new URLSearchParams({
        target: formattedPhone,
        message: `*[ SAKU ]*\n\nKode OTP: *${otpCode}*\n\nBerlaku 5 menit.`
      }),
    });

    clearTimeout(id);
    const fonnteData = await fonnteResponse.json();

    return NextResponse.json({
      success: true,
      message: 'OTP terkirim!',
      phone: formattedPhone
    });

  } catch (err: any) {
    console.error('❌ [RequestOTP API] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Gagal proses OTP' }, { status: 500 });
  }
}
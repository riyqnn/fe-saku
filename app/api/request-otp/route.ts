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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const fonnteToken = process.env.FONNTE_TOKEN?.trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Gagal memproses permintaan (Server Config Error)' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { fetch: (...args) => fetch(...args) },
    });
    
    const formattedPhone = normalizePhoneForFonnte(phone);
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const encryptedOTP = encrypt(otpCode);

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

    if (dbError) {
      return NextResponse.json({ error: 'Gagal menyimpan data verifikasi' }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const fonnteResponse = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Authorization': fonnteToken || '',
          'Accept': 'application/json' 
        },
        body: new URLSearchParams({
          target: formattedPhone,
          message: `*[ SAKU ]*\n\nYour OTP code is: *${otpCode}*\n\nDo not share this code with anyone. Valid for 5 minutes.`
        }),
      });

      clearTimeout(timeoutId);

      if (!fonnteResponse.ok) {
        const errorText = await fonnteResponse.text();
        throw new Error(`External service responded with ${fonnteResponse.status}: ${errorText}`);
      }

      const fonnteData = await fonnteResponse.json();

      if (!fonnteData.status) {
        throw new Error(fonnteData.reason || 'Fonnte provider rejected the dispatch');
      }

      return NextResponse.json({
        success: true,
        message: 'OTP terkirim!',
        phone: formattedPhone
      });

    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Koneksi ke gateway Fonnte timeout (12s)' }, { status: 504 });
      }
      return NextResponse.json({ error: 'Gagal mengirim OTP ke nomor Anda' }, { status: 502 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
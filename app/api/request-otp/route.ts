// app/api/request-otp/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper khusus Fonnte: Hanya angka, 08xxx jadi 628xxx
function normalizePhoneForFonnte(phone: string): string {
  let normalized = phone.replace(/\D/g, ''); // Hapus semua non-angka
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Nomor HP wajib diisi bos!' },
        { status: 400 }
      );
    }

    console.log('📱 [RequestOTP API] Phone Raw:', phone);
    const formattedPhone = normalizePhoneForFonnte(phone);
    console.log('📋 [RequestOTP API] Formatted for Fonnte:', formattedPhone);

    // 1. Inisialisasi Supabase Admin (Bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Generate OTP (6 Digit acak)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Berlaku 5 menit

    console.log(`🔐 [RequestOTP API] Generated OTP: ${otpCode} for ${formattedPhone}`);

    // 3. Simpan OTP ke tabel otp_verifications
    const { error: dbError } = await supabaseAdmin
      .from('otp_verifications')
      .insert([
        { 
          phone_number: formattedPhone, 
          otp_code: otpCode, 
          expired_at: expiresAt.toISOString(),
          is_used: false 
        }
      ]);

    if (dbError) {
      console.error('❌ [Database Error]:', dbError.message);
      throw new Error('Gagal menyimpan data OTP ke database');
    }

    // 4. Tembak API Fonnte
    console.log('🚀 [RequestOTP API] Sending via Fonnte...');
    
    const fonnteResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 
        'Authorization': process.env.FONNTE_TOKEN || '' 
      },
      body: new URLSearchParams({
        target: formattedPhone,
        message: `*[ SAKU - Security Verification ]*\n\nYour One-Time Password (OTP) is: *${otpCode}*\n\nThis code is valid for the next 5 minutes. For your security, never share this code with anyone. Saku representatives will never ask for your OTP.`
      }),
    });

    const fonnteData = await fonnteResponse.json();

    if (!fonnteData.status) {
      console.error('❌ [Fonnte Error]:', fonnteData.reason);
      throw new Error(fonnteData.reason || 'Fonnte gagal kirim pesan');
    }

    console.log('✅ [RequestOTP API] OTP berhasil dikirim ke WhatsApp!');

    return NextResponse.json({
      success: true,
      message: 'OTP sudah dikirim via WhatsApp',
      phone: formattedPhone
    });

  } catch (err: any) {
    console.error('❌ [RequestOTP API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses permintaan OTP' },
      { status: 500 }
    );
  }
}
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

    // 1. Validasi Environment Variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const fonnteToken = process.env.FONNTE_TOKEN?.trim();

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase Config");
      return NextResponse.json({ error: 'Server configuration error (Supabase)' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: (...args) => fetch(...args), // Memastikan menggunakan fetch bawaan Node.js
      },
    });
    
    const formattedPhone = normalizePhoneForFonnte(phone);
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 
    const encryptedOTP = encrypt(otpCode);

    // 2. Simpan ke Database
    console.log(`📡 [RequestOTP] Storing OTP for ${formattedPhone}...`);
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
      console.error('❌ Database Error:', dbError.message);
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    // 3. Kirim via Fonnte dengan Timeout & Error Handling yang lebih kuat
    console.log(`🚀 [RequestOTP] Sending SMS via Fonnte...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // Naikkan ke 12 detik

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
          message: `*[ SAKU ]*\n\nKode OTP lo: *${otpCode}*\n\nJangan kasih tau siapa-siapa ya. Berlaku 5 menit.`
        }),
      });

      clearTimeout(timeoutId);

      if (!fonnteResponse.ok) {
        const errorText = await fonnteResponse.text();
        throw new Error(`Fonnte API responded with ${fonnteResponse.status}: ${errorText}`);
      }

      const fonnteData = await fonnteResponse.json();

      if (!fonnteData.status) {
        throw new Error(fonnteData.reason || 'Fonnte rejected the request');
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
      console.error('❌ [Fonnte Fetch Error]:', fetchErr.message);
      return NextResponse.json({ error: `Fonnte Error: ${fetchErr.message}` }, { status: 502 });
    }

  } catch (err: any) {
    console.error('❌ [RequestOTP API] Global Error:', err.message);
    return NextResponse.json({ error: err.message || 'Gagal memproses permintaan' }, { status: 500 });
  }
}
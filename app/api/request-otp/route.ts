import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper to normalize phone number
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  } else if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  return '+' + normalized;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      );
    }

    console.log('📱 [RequestOTP API] Phone:', phone);

    const formattedPhone = normalizePhone(phone);
    console.log('📋 [RequestOTP API] Formatted phone:', formattedPhone);

    // Use Supabase to send OTP via SMS (third-party SMS delivery)
    console.log('🔐 [RequestOTP API] Sending OTP via Supabase SMS...');

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Call Supabase to send OTP via SMS
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error('❌ [RequestOTP API] Supabase SMS error:', error.message);
      throw error;
    }

    console.log('✅ [RequestOTP API] OTP sent via Supabase SMS');
    console.log('📱 [RequestOTP API] SMS sent to:', formattedPhone);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your phone via SMS',
      phone: formattedPhone,
    });
  } catch (err: any) {
    console.error('❌ [RequestOTP API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

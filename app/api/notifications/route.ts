import { NextResponse } from 'next/server';
import { createSakuServerClient } from '@/lib/supabaseServer';
import { validateAuth } from '@/lib/auth-middleware';

export async function GET(request: Request) {
  const supabase = await createSakuServerClient();
  
  try {
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', auth.phone!)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json(notifications);

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch notifications', details: error.message }, { status: 500 });
  }
}

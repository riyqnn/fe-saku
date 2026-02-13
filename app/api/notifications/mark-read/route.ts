import { NextResponse } from 'next/server';
import { createSakuServerClient } from '@/lib/supabaseServer';
import { validateAuth } from '@/lib/auth-middleware';

export async function POST(request: Request) {
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

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to mark notifications as read', details: error.message }, { status: 500 });
  }
}

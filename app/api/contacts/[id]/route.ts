import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (...args) => fetch(...args),
    },
  }
);

async function getSakuUserId(req: Request) {
  const phone = req.headers.get('x-saku-phone');
  if (!phone) return null;

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phone)
      .single();

    if (error || !profile) return null;
    return profile.id;
  } catch (err) {
    console.error("❌ Auth Lookup Failed:", err);
    return null;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const resolvedParams = await params;
    const contactId = resolvedParams.id;

    const userId = await getSakuUserId(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!contactId || contactId === "undefined") {
      return NextResponse.json({ error: 'ID Kontak tidak valid' }, { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({ 
      success: true, 
      message: 'Kontak berhasil dihapus' 
    });

  } catch (error: any) {
    console.error('Delete Contact API Final Error:', error.message);
    
    const isFetchError = error.message.includes('fetch');
    return NextResponse.json({ 
      error: isFetchError ? "Koneksi database terputus, coba lagi" : error.message 
    }, { status: 500 });
  }
}
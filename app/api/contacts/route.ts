import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { hashPhoneNumber } from '@/utils/phoneHash';

// GET - Fetch user's contacts
export async function GET(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      contacts: contacts || [],
    });

  } catch (error: any) {
    console.error('Get Contacts Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to get contacts'
    }, { status: 500 });
  }
}

// POST - Create new contact
export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone_number } = await req.json();

    // Validate inputs
    if (!name || !phone_number) {
      return NextResponse.json({ error: 'Missing required fields: name, phone_number' }, { status: 400 });
    }

    // Check if contact already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone_number', phone_number)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Contact with this phone number already exists' }, { status: 400 });
    }

    // Try to get wallet address from phone number (if user has registered)
    let wallet_address = null;
    try {
      const phoneHash = hashPhoneNumber(phone_number);
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('phone_hash', phoneHash)
        .single();

      if (profile) {
        wallet_address = profile.wallet_address;
      }
    } catch (e) {
      // User might not be registered, that's okay
      console.log('User not registered yet:', phone_number);
    }

    // Create contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name,
        phone_number,
        wallet_address,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      contact,
    });

  } catch (error: any) {
    console.error('Create Contact Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create contact'
    }, { status: 500 });
  }
}

import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// DELETE - Remove a contact
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSakuServerClient();

  try {
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactId = params.id;

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Delete contact (only if it belongs to the user)
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete Contact Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to delete contact'
    }, { status: 500 });
  }
}

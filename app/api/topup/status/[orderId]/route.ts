import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createSakuServerClient();

  try {
    const { orderId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: topup, error } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .single();

    if (error || !topup) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: topup.order_id,
        amount: topup.amount,
        paymentMethod: topup.payment_method,
        status: topup.status,
        contractTxHash: topup.contract_tx_hash,
        createdAt: topup.created_at,
        contractTimestamp: topup.contract_timestamp,
      },
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to check status'
    }, { status: 500 });
  }
}

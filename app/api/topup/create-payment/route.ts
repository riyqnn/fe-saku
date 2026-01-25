import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { createMidtransTransaction, idrxToIdr } from '@/lib/midtrans';
import { generateOrderId } from '@/lib/orderIdGenerator';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, paymentMethod } = await req.json();

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!['gopay', 'ovo', 'dana'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const amountNum = parseFloat(amount);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number, phone_hash, wallet_address, full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const orderId = generateOrderId(user.id);

    const midtransResponse = await createMidtransTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: idrxToIdr(amountNum),
      },
      customer_details: {
        first_name: profile.full_name || 'User',
        last_name: '',
        email: profile.email || `${user.id}@sakuwallet.id`,
        phone: profile.phone_number,
      },
      item_details: [
        {
          id: 'IDRX_TOPUP',
          price: idrxToIdr(amountNum),
          quantity: 1,
          name: `IDRX Top Up - ${amountNum} IDRX`,
        },
      ],
      enabled_payments: [paymentMethod],
    });

    const { error: insertError } = await supabase
      .from('topup_requests')
      .insert({
        order_id: orderId,
        user_id: user.id,
        phone_hash: profile.phone_hash,
        wallet_address: profile.wallet_address,
        amount: amountNum,
        payment_method: paymentMethod,
        midtrans_transaction_id: orderId,
        midtrans_payment_url: midtransResponse.redirect_url,
        status: 'pending',
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save topup request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId,
      token: midtransResponse.token,
      redirectUrl: midtransResponse.redirect_url,
    });

  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create payment'
    }, { status: 500 });
  }
}

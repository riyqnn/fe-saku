import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { verifyMidtransSignature } from '@/lib/midtrans';
import { CONTRACTS } from '@/lib/config';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';

interface MidtransWebhookPayload {
  transaction_status: string;
  fraud_status: string;
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    const payload: MidtransWebhookPayload = await req.json();

    const isValidSignature = verifyMidtransSignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key
    );

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { data: topup, error: topupError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('order_id', payload.order_id)
      .single();

    if (topupError || !topup) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (topup.status === 'completed') {
      return NextResponse.json({ success: true });
    }

    const isSuccess = payload.transaction_status === 'capture' ||
                     payload.transaction_status === 'settlement';
    const isPending = payload.transaction_status === 'pending';
    const isFailed = payload.transaction_status === 'deny' ||
                    payload.transaction_status === 'expire' ||
                    payload.transaction_status === 'cancel';

    if (isSuccess) {
      await supabase
        .from('topup_requests')
        .update({
          status: 'processing',
          midtrans_callback_at: new Date().toISOString(),
        })
        .eq('order_id', payload.order_id);

      try {
        const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
        if (!adminPrivateKey) {
          throw new Error('ADMIN_PRIVATE_KEY not configured');
        }

        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL!
        );
        const wallet = new ethers.Wallet(adminPrivateKey, provider);

        const contract = new ethers.Contract(
          CONTRACTS.REGISTRY_ADDRESS,
          SAKU_REGISTRY_ABI,
          wallet
        );

        const amountBigInt = ethers.parseUnits(topup.amount.toString(), 6);
        const phoneHash = topup.phone_hash;

        const tx = await contract.topup(phoneHash, amountBigInt);
        const receipt = await tx.wait();

        await supabase
          .from('topup_requests')
          .update({
            status: 'completed',
            contract_tx_hash: receipt.hash,
            contract_timestamp: new Date().toISOString(),
          })
          .eq('order_id', payload.order_id);

      } catch (contractError: any) {

        await supabase
          .from('topup_requests')
          .update({
            status: 'failed',
          })
          .eq('order_id', payload.order_id);

        return NextResponse.json({
          error: 'Contract execution failed',
          details: contractError.message
        }, { status: 500 });
      }

    } else if (isPending) {
      await supabase
        .from('topup_requests')
        .update({
          status: 'pending',
          midtrans_callback_at: new Date().toISOString(),
        })
        .eq('order_id', payload.order_id);

    } else if (isFailed) {
      await supabase
        .from('topup_requests')
        .update({
          status: 'failed',
          midtrans_callback_at: new Date().toISOString(),
        })
        .eq('order_id', payload.order_id);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Webhook processing failed'
    }, { status: 500 });
  }
}

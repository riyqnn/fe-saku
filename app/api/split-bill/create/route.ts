import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPhoneNumber } from '@/utils/phoneHash';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorPhone, items, totalTax, totalDiscount, description } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const subtotal = items.reduce((acc: number, item: any) => acc + ((item.price * (item.qty || 1)) || 0), 0);
    
    const discountAmount = Number(totalDiscount);
    const netAdjustment = Number(totalTax) - discountAmount;
    const grandTotal = Math.round(subtotal + netAdjustment);

    const { data: bill, error: billError } = await supabase
      .from('split_bills')
      .insert([{
        creator_id: creatorPhone,
        total_amount: grandTotal,
        tax_amount: Number(totalTax),
        discount_amount: discountAmount,
        description: description || "Shared Split Bill"
      }]).select().single();

    if (billError) throw new Error('Failed to create bill header');

    const flatBillItems: any[] = [];

    items.forEach((item: any) => {
      if (!item.assignedTo || item.assignedTo.length === 0) return;

      const itemTotalValue = item.price * (item.qty || 1);
      
      const itemRatio = subtotal > 0 ? itemTotalValue / subtotal : 0;
      const itemShareOfAdjustment = itemRatio * netAdjustment;
      
      const finalItemTotalPrice = itemTotalValue + itemShareOfAdjustment;
      
      const pricePerPerson = finalItemTotalPrice / item.assignedTo.length;

      item.assignedTo.forEach((friendPhone: string) => {
        if (friendPhone === creatorPhone) return;

        flatBillItems.push({
          bill_id: bill.id,
          debtor_phone_hash: hashPhoneNumber(friendPhone),
          item_name: item.qty > 1 ? `${item.qty}x ${item.name}` : item.name,
          amount: Math.round(pricePerPerson)
        });
      });
    });

    if (flatBillItems.length > 0) {
      await supabase.from('split_bill_items').insert(flatBillItems);
    }

    return NextResponse.json({ success: true, billId: bill.id, totalAmount: grandTotal });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
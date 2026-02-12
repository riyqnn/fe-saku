import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPhoneNumber } from '@/utils/phoneHash';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorPhone, items, totalTax, totalDiscount, description } = body;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.price) * (item.qty || 1)), 0);
    const netAdjustment = Number(totalTax) - Number(totalDiscount);
    const grandTotal = subtotal + netAdjustment;

    const { data: bill, error: billErr } = await supabase
      .from('split_bills')
      .insert([{
        creator_id: creatorPhone,
        total_amount: grandTotal,
        tax_amount: Number(totalTax),
        discount_amount: Number(totalDiscount),
        description: description || "Split Bill",
        status: 'pending'
      }]).select().single();

    if (billErr) throw billErr;

    const flatBillItems: any[] = [];

    items.forEach((item: any) => {
      if (!item.assignedTo || item.assignedTo.length === 0) return;

      const itemBase = Number(item.price) * (item.qty || 1);
      const ratio = subtotal > 0 ? itemBase / subtotal : 0;
      const finalItemTotal = itemBase + (ratio * netAdjustment);
      const pricePerPerson = finalItemTotal / item.assignedTo.length;

      item.assignedTo.forEach((phone: string) => {
        const isCreator = phone === creatorPhone;
        flatBillItems.push({
          bill_id: bill.id,
          debtor_phone_hash: hashPhoneNumber(phone),
          item_name: item.qty > 1 ? `${item.qty}x ${item.name}` : item.name,
          amount: pricePerPerson,
          is_paid: isCreator, // Porsi Me otomatis TRUE
          status: isCreator ? 'paid' : 'pending' // Porsi Me otomatis PAID
        });
      });
    });

    await supabase.from('split_bill_items').insert(flatBillItems);

    return NextResponse.json({ success: true, billId: bill.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
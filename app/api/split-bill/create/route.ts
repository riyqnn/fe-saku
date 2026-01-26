import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPhoneNumber } from '@/utils/phoneHash';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorPhone, items, totalTax, totalDiscount, description } = body;

    // 1. Initialize Supabase Admin with fetch for Node.js environment compatibility
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: { fetch: (...args) => fetch(...args) },
      }
    );

    // 2. Financial Logic: Calculate totals and adjustments
    // Subtotal: Sum of all menu items before tax and discount
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.price || 0), 0);
    
    // Percentage-based Discount: (Subtotal * Discount Percent) / 100
    const discountAmount = (subtotal * Number(totalDiscount)) / 100;
    
    // Net Adjustment: Total Tax minus calculated Discount Amount
    const netAdjustment = Number(totalTax) - discountAmount;
    
    // Final Grand Total for the Split Bill
    const grandTotal = Math.round(subtotal + netAdjustment);

    console.info(`[SplitBill API] Processing bill: "${description}" | Subtotal: ${subtotal} | Discount: ${discountAmount}`);

    // 3. Store the Master Split Bill Record (Header)
    const { data: bill, error: billError } = await supabase
      .from('split_bills')
      .insert([{
        creator_id: creatorPhone,
        total_amount: grandTotal,
        tax_amount: Number(totalTax),
        discount_amount: Math.round(discountAmount),
        description: description || "Shared Split Bill"
      }]).select().single();

    if (billError) {
      console.error(`[Database Error] Header insertion failed: ${billError.message}`);
      return NextResponse.json({ error: 'Failed to create bill record' }, { status: 500 });
    }

    // 4. Item-Level Distribution Logic (Proportional & Fair)
    const flatBillItems: any[] = [];

    items.forEach((item: any) => {
      if (item.assignedTo.length === 0) return;

      // Each item gets a proportional share of the tax/discount based on its original price
      const itemShareOfAdjustment = (item.price / subtotal) * netAdjustment;
      const finalItemPrice = item.price + itemShareOfAdjustment;
      
      // Split the final item price equally among assigned friends
      const pricePerPerson = finalItemPrice / item.assignedTo.length;

      item.assignedTo.forEach((friendPhone: string) => {
        // Skip the creator to avoid self-billing on-chain
        if (friendPhone === creatorPhone) return;

        flatBillItems.push({
          bill_id: bill.id,
          debtor_phone_hash: hashPhoneNumber(friendPhone),
          item_name: item.name,
          amount: Math.round(pricePerPerson) // Rounded for blockchain transaction clarity
        });
      });
    });

    // 5. Batch Insert Individual Debts
    if (flatBillItems.length > 0) {
      const { error: itemError } = await supabase
        .from('split_bill_items')
        .insert(flatBillItems);

      if (itemError) {
        console.error(`[Database Error] Item insertion failed: ${itemError.message}`);
        return NextResponse.json({ error: 'Failed to dispatch individual bill items' }, { status: 500 });
      }
    }

    console.info(`[SplitBill API] Successfully dispatched ${flatBillItems.length} bill items to recipients.`);

    return NextResponse.json({ 
      success: true, 
      billId: bill.id, 
      totalAmount: grandTotal 
    });

  } catch (err: any) {
    console.error(`[Internal Server Error] Split bill failed: ${err.message}`);
    return NextResponse.json({ error: 'Internal system failure during split bill creation' }, { status: 500 });
  }
}
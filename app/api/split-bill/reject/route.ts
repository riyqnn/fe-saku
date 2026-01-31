import { createSakuServerClient } from "@/lib/supabaseServer"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const supabase = await createSakuServerClient()
    const { billId, phoneHash } = await req.json()

    const { error } = await supabase
      .from('split_bill_items')
      .update({ status: 'rejected' }) 
      .eq('bill_id', billId)
      .eq('debtor_phone_hash', phoneHash)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
import { createSakuServerClient } from "@/lib/supabaseServer"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const supabase = await createSakuServerClient()
    const { billId, phoneHash, reason } = await req.json()

    const { error: itemError } = await supabase
      .from('split_bill_items')
      .update({ 
        status: 'rejected',
        rejection_reason: reason // Simpan alasan di sini
      }) 
      .eq('bill_id', billId)
      .eq('debtor_phone_hash', phoneHash)

    if (itemError) throw itemError

    // Opsional: Bisa kirim notifikasi push ke creator di sini
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
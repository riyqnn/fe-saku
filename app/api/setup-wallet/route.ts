import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/encryp';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();
  
  try {
    // 1. Cek Auth Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone_number, phone_hash } = await req.json();

    // 2. Generate Wallet Baru
    const wallet = ethers.Wallet.createRandom();
    const { encryptedData, iv, authTag } = encrypt(wallet.privateKey);

    // 3. Simpan ke Database Supabase
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        phone_number,
        phone_hash,
        wallet_address: wallet.address,
        encrypted_private_key: encryptedData,
        encryption_iv: iv,
        auth_tag: authTag,
        is_verified: true,
      });

    if (dbError) throw dbError;

    // 4. Register ke Smart Contract (On-chain)
    // Note: Di production, gunakan Relayer/Admin Wallet untuk membayar gas fee registrasi awal
    // agar user tidak perlu punya Saldo Native Token di awal.
    
    return NextResponse.json({ 
      success: true, 
      wallet_address: wallet.address 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
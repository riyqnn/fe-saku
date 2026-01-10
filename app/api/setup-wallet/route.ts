// app/api/setup-wallet/route.ts
import { createServerClient } from '@supabase/ssr'; // Ganti import ini
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/crypto';
import { SAKU_ABI, hashPhone, getProvider } from '@/lib/blockchain';

export async function POST() {
  // 1. Ambil Cookie Store (Wajib await di Next.js terbaru)
  const cookieStore = await cookies();

  // 2. Setup Supabase Client untuk validasi Session User
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Error handling standar untuk Server Actions/API Routes
          }
        },
      },
    }
  );

  // 3. Cek Session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 4. Setup Admin Client (Service Role) untuk akses DB tanpa RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const userPhone = session.user.phone!; // Format +62...

    // A. Cek DB: Udah punya wallet belum?
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_address')
      .eq('id', session.user.id)
      .single();

    if (profile?.wallet_address) {
      return NextResponse.json({ message: 'User sudah terdaftar', address: profile.wallet_address });
    }

    console.log(`[Setup] Membuat wallet untuk ${userPhone}...`);

    // B. GENERATE WALLET USER
    const provider = getProvider();
    const userWallet = ethers.Wallet.createRandom().connect(provider);
    
    // C. ADMIN KIRIM GAS (Subsidi)
    // Karena register() pake msg.sender, wallet user harus punya saldo MATIC dikit buat eksekusi
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
    
    // Kirim 0.005 ETH/MATIC (Cukup buat gas fee testnet)
    const gasTx = await adminWallet.sendTransaction({
      to: userWallet.address,
      value: ethers.parseEther("0.005") 
    });
    await gasTx.wait();
    console.log("Gas sent to user:", gasTx.hash);

    // D. USER REGISTER KE SMART CONTRACT
    const contract = new ethers.Contract(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!, SAKU_ABI, userWallet);
    const phoneHash = hashPhone(userPhone);

    const regTx = await contract.register(phoneHash);
    await regTx.wait();
    console.log("User registered on-chain:", regTx.hash);

    // E. SIMPAN KE DB (Encrypted)
    const encryptedKey = encrypt(userWallet.privateKey);

    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: session.user.id,
        phone_number: userPhone,
        wallet_address: userWallet.address,
        encrypted_private_key: encryptedKey
      });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, address: userWallet.address });

  } catch (error: any) {
    console.error("Error Setup:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
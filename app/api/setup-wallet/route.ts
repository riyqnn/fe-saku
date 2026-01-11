import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/encryp';
import { SAKU_ABI, hashPhone, getProvider } from '@/lib/blockchain';

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userPhone = session.user.phone!; 
    const phoneHash = hashPhone(userPhone);

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', session.user.id)
      .single();

    if (profile?.wallet_address) {
      return NextResponse.json({ message: 'Wallet sudah aktif', address: profile.wallet_address });
    }

    const provider = getProvider();
    
    const userWallet = ethers.Wallet.createRandom().connect(provider);
    
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
    const gasTx = await adminWallet.sendTransaction({
      to: userWallet.address,
      value: ethers.parseEther("0.005") 
    });
    await gasTx.wait();

    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!, 
      SAKU_ABI, 
      userWallet
    );

    const regTx = await contract.register(phoneHash, userWallet.address);
    await regTx.wait();

    const { encryptedData, iv, authTag } = encrypt(userWallet.privateKey);

    const { error: dbError } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        phone_number: userPhone,
        phone_hash: phoneHash,
        wallet_address: userWallet.address,
        encrypted_private_key: encryptedData,
        encryption_iv: iv,
        auth_tag: authTag,
        is_verified: true
      });

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      address: userWallet.address,
      txHash: regTx.hash 
    });

  } catch (error: any) {
    console.error("Setup Wallet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
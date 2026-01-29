import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/encryp';
import { SAKU_ABI, hashPhone, getProvider } from '@/lib/blockchain';
import { createSakuServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supabase = await createSakuServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const body = await req.json().catch(() => ({}));
    
    const uid = session?.user?.id || body.uid;
    const userPhone = session?.user?.phone || body.phone;

    if (!uid) {
      return NextResponse.json({ error: 'User ID tidak ditemukan.' }, { status: 401 });
    }

    if (!userPhone) {
      return NextResponse.json({ error: 'Nomor telepon tidak ditemukan.' }, { status: 400 });
    }

    const phoneHash = hashPhone(userPhone);
    const provider = getProvider();
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      SAKU_ABI,
      provider
    );

    const isRegistered = await contract.isRegistered(phoneHash);

    if (isRegistered) {
      const walletAddress = await contract.getAccount(phoneHash);

      const { error: syncError } = await supabase
        .from('profiles')
        .update({
          phone_number: userPhone,
          phone_hash: phoneHash,
          wallet_address: walletAddress,
          is_verified: true,
        })
        .eq('id', uid);

      if (syncError) throw syncError;
      return NextResponse.json({ success: true, isNewUser: false });
    }

    const seed = ethers.id(userPhone + process.env.ENCRYPTION_KEY);
    const userWallet = new ethers.Wallet(seed);
    
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
    const contractWithAdmin = contract.connect(adminWallet) as any;
    
    const regTx = await contractWithAdmin.register(phoneHash, userWallet.address);
    await regTx.wait();

    const encryptionResult = encrypt(userWallet.privateKey);

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: uid,
      phone_number: userPhone,
      phone_hash: phoneHash,
      wallet_address: userWallet.address,
      encrypted_private_key: encryptionResult.encryptedData,
      encryption_iv: encryptionResult.iv,                   
      auth_tag: encryptionResult.authTag,                  
      is_verified: true,
    });

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ 
      success: true, 
      isNewUser: true,
      address: userWallet.address 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
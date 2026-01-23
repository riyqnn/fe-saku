import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/encryp'; // Pastikan path ini bener (encryp atau encrypt)
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

    // 1. Cek On-Chain
    const isRegistered = await contract.isRegistered(phoneHash);
    
    if (isRegistered) {
      const walletAddress = await contract.getAccount(phoneHash);
      console.log("🔄 Syncing existing user...");

      // Kalo user udah ada di blockchain tapi datanya ilang di DB lo, 
      // SEBAIKNYA lo jangan kasih data dummy '0'. 
      // Tapi karena Private Key lama udah ilang (kalo ga disimpen di seed), 
      // kita update profile-nya aja tanpa nimpa key lama kalo ada.
      
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

    // 2. New User Registration - THE REAL ENCRYPTION
    console.log("🆕 Registering new user on-chain...");
    
    // Kita buat wallet baru
    // const userWallet = ethers.Wallet.createRandom();
    const seed = ethers.id(userPhone + process.env.ENCRYPTION_KEY);
    const userWallet = new ethers.Wallet(seed);
    
    // Admin Wallet buat bayar gas registrasi
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
    const contractWithAdmin = contract.connect(adminWallet) as any;
    
    // Register di blockchain
    const regTx = await contractWithAdmin.register(phoneHash, userWallet.address);
    await regTx.wait();

    // 3. ENKRIPSI PRIVATE KEY YANG BENER
    // Kita enkripsi userWallet.privateKey pake function dari @/lib/encryp
    const encryptionResult = encrypt(userWallet.privateKey);

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: uid,
      phone_number: userPhone,
      phone_hash: phoneHash,
      wallet_address: userWallet.address,
      encrypted_private_key: encryptionResult.encryptedData, // Hasil enkripsi rill
      encryption_iv: encryptionResult.iv,                   // IV rill
      auth_tag: encryptionResult.authTag,                   // Auth Tag rill
      is_verified: true,
    });

    if (dbError) {
      console.error("❌ Database Error:", dbError);
      throw dbError;
    }

    return NextResponse.json({ 
      success: true, 
      isNewUser: true,
      address: userWallet.address 
    });

  } catch (error: any) {
    console.error("❌ Auth API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/encryp';
import { SAKU_ABI, hashPhone, getProvider } from '@/lib/blockchain';
import { createSakuServerClient } from '@/lib/supabaseServer';
import { auth } from 'firebase-admin';

export async function POST(req: Request) {
 const authHeader = req.headers.get('Authorization');
 const token = authHeader?.split('Bearer ')[1];

 if(!token) return NextResponse.json({error:'Unauthorized: Missing Token'}, {status:401});

 try{
    const supabase = await createSakuServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if(authError || !user) throw new Error("Invalid session");

    const userPhone = user.phone;
    const uid = user.id; 
    if(!userPhone) throw new Error("Phone number not found");

    const phoneHash = hashPhone(userPhone);
    const provider = getProvider();

    const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    SAKU_ABI,
    provider
    );

    const isRegistered = await contract.isRegistered(phoneHash);
    if(isRegistered){
    const walletAddress = await contract.getAccount(phoneHash);
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', uid)
      .single();
      return NextResponse.json({
        success: true,
        message: 'Welcome back!',
        address: walletAddress,
        isNewUser: false
      });
    }

    const userWallet = ethers.Wallet.createRandom().connect(provider);
    const adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY!,
    provider
    );

    const gasTx = await adminWallet.sendTransaction({
    to: userWallet.address,
    value: ethers.parseEther("0.005")
    });
    await gasTx.wait();
    
    const contractWithSigner = contract.connect(adminWallet) as any;
    const regTx = await contractWithSigner.register(phoneHash, userWallet.address);
    await regTx.wait();

    const { encryptedData, iv, authTag } = encrypt(userWallet.privateKey);

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: uid,
      phone_number: userPhone,
      phone_hash: phoneHash,
      wallet_address: userWallet.address,
      encrypted_private_key: encryptedData,
      encryption_iv: iv,
      auth_tag: authTag,
      is_verified: true,
  });

    if(dbError) throw dbError;
  
    return NextResponse.json({
    success: true,
    message: 'Account created successfully',
    address: userWallet.address,
    isNewUser: true
    });

  } catch(error: any){
    console.error("Error :", error);
    return NextResponse.json({error: error.message}, { status: 500 });
  }
}
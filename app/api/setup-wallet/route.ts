import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { encrypt } from '@/lib/encryp';
import { SAKU_ABI, hashPhone, getProvider } from '@/lib/blockchain';
import { adminAuth, db } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const userPhone = decodedToken.phone_number; 

    if (!userPhone) throw new Error("Phone number not found in token");

    const phoneHash = hashPhone(userPhone);

    const userRef = db.collection('profiles').doc(uid);
    const doc = await userRef.get();

    if (doc.exists && doc.data()?.wallet_address) {
      return NextResponse.json({ success: true, message: 'Already active' });
    }

    const provider = getProvider();
    const userWallet = ethers.Wallet.createRandom().connect(provider);
    
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
    const gasTx = await adminWallet.sendTransaction({
      to: userWallet.address,
      value: ethers.parseEther("0.0005") 
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

    await userRef.set({
      id: uid,
      phone_number: userPhone,
      phone_hash: phoneHash,
      wallet_address: userWallet.address,
      encrypted_private_key: encryptedData,
      encryption_iv: iv,
      auth_tag: authTag,
      is_verified: true,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, address: userWallet.address });

  } catch (error: any) {
    console.error("Setup Wallet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
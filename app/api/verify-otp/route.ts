// app/api/verify-otp/route.ts
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { encrypt, decrypt } from '@/utils/encrypt';

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();
    const formattedPhone = phone.replace(/\D/g, '').startsWith('0') ? '62' + phone.replace(/\D/g, '').substring(1) : phone.replace(/\D/g, '');
    
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Verifikasi OTP (Logic Dekripsi)
    const { data: records } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('is_used', false)
      .gt('expired_at', new Date().toISOString());

    let validRecord = null;
    if (records) {
      for (const record of records) {
        try {
          if (decrypt(record.otp_code, record.encryption_iv, record.auth_tag) === otp) {
            validRecord = record;
            break;
          }
        } catch (e) { continue; }
      }
    }

    if (!validRecord) return NextResponse.json({ error: 'OTP Salah' }, { status: 400 });
    await supabaseAdmin.from('otp_verifications').update({ is_used: true }).eq('id', validRecord.id);

    // 2. Persiapan Profil
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const phoneHash = hashPhoneNumber(formattedPhone);
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('phone_number', formattedPhone).maybeSingle();

    let walletAddress;
    let privKey;
    const isNew = !profile;

    if (isNew) {
      const wallet = ethers.Wallet.createRandom();
      walletAddress = wallet.address;
      privKey = wallet.privateKey;

      const enc = encrypt(privKey);
      await supabaseAdmin.from('profiles').insert([{
        id: crypto.randomUUID(),
        phone_number: formattedPhone,
        phone_hash: phoneHash,
        wallet_address: walletAddress,
        encrypted_private_key: enc.encryptedData,
        encryption_iv: enc.iv,
        auth_tag: enc.authTag,
        is_verified: true
      }]);
    } else {
      walletAddress = profile.wallet_address;
      privKey = decrypt(profile.encrypted_private_key, profile.encryption_iv, profile.auth_tag);
    }

    // 3. BACKGROUND WORKER (Non-Blocking)
    // Biar user langsung masuk ke Home, tapi on-chain tetep dikerjain
    (async () => {
      try {
        const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
        const registry = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, admin);
        
        // Cek Registry
        const registered = await registry.isRegistered(phoneHash);
        if (!registered) {
          console.log(`⛓️ [BG] Registering ${formattedPhone}...`);
          const tx = await registry.register(phoneHash, walletAddress);
          await tx.wait();
        }

        // Auto-Approve IDRX
        const userWallet = new ethers.Wallet(privKey, provider);
        const idrx = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, userWallet);
        console.log(`🔓 [BG] Approving IDRX for ${formattedPhone}...`);
        const appTx = await idrx.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256);
        await appTx.wait();
        
        console.log(`✅ [BG] On-chain Setup Done for ${formattedPhone}`);
      } catch (e) {
        console.error('❌ [BG Error]:', e);
      }
    })();

    return NextResponse.json({
      success: true,
      walletAddress,
      isNewRegistration: isNew
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
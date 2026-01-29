import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { encrypt, decrypt } from '@/utils/encrypt';

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1);
  return normalized;
}

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();
    const formattedPhone = normalizePhone(phone);
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: records } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('is_used', false)
      .gt('expired_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    let validRecord = null;
    if (records) {
      for (const record of records) {
        try {
          const decrypted = decrypt(record.otp_code, record.encryption_iv, record.auth_tag);
          if (decrypted === otp) {
            validRecord = record;
            break;
          }
        } catch (e) { continue; }
      }
    }

    if (!validRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    
    await supabaseAdmin.from('otp_verifications').update({ is_used: true }).eq('id', validRecord.id);

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL, undefined, { staticNetwork: true });
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

    (async () => {
      try {
        const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
        const registry = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, admin);
        
        // Gas Funding
        const balance = await provider.getBalance(walletAddress);
        if (balance === BigInt(0)) {
          const txGas = await admin.sendTransaction({
            to: walletAddress,
            value: ethers.parseEther("0.005")
          });
          await txGas.wait();
        }

        // On-chain Registry Mapping
        const registered = await registry.isRegistered(phoneHash);
        if (!registered) {
          const txReg = await registry.register(phoneHash, walletAddress);
          await txReg.wait();
        }

        // Approval
        const userWallet = new ethers.Wallet(privKey, provider);
        const idrx = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, userWallet);
        const allowance = await idrx.allowance(walletAddress, CONTRACTS.REGISTRY_ADDRESS);
        
        if (allowance < ethers.parseUnits("1000000", 6)) {
          const appTx = await idrx.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256);
          await appTx.wait();
        }

      } catch (e) {
      }
    })();

    return NextResponse.json({
      success: true,
      message: isNew ? 'Wallet created and setup initiated' : 'Authentication successful',
      walletAddress,
      privateKey: privKey,
      isNewRegistration: isNew
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Internal verification failure' }, { status: 500 });
  }
}
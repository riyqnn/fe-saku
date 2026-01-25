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
    
    // Inisialisasi Supabase Admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verifikasi OTP (Ambil data terenkripsi dari DB)
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

    if (!validRecord) return NextResponse.json({ error: 'OTP Salah atau Expired' }, { status: 400 });
    
    // Tandai OTP digunakan
    await supabaseAdmin.from('otp_verifications').update({ is_used: true }).eq('id', validRecord.id);

    // 2. Persiapan Wallet & Provider
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL, undefined, { staticNetwork: true });
    const phoneHash = hashPhoneNumber(formattedPhone);
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('phone_number', formattedPhone).maybeSingle();

    let walletAddress;
    let privKey;
    const isNew = !profile;

    if (isNew) {
      // Generate wallet baru untuk user baru
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

    // 3. BACKGROUND WORKER (Proses Blockchain Tanpa Await)
    // Biar API langsung merespon sukses ke user sementara blockchain diproses
    (async () => {
      try {
        const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
        const registry = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, admin);
        
        // A. Kirim Saldo ETH (Bensin Gas) jika saldo user masih 0
        const balance = await provider.getBalance(walletAddress);
        if (balance === BigInt(0)) {
          console.log(`⛽ [BG] Sending gas money (ETH) to ${formattedPhone}...`);
          const txGas = await admin.sendTransaction({
            to: walletAddress,
            value: ethers.parseEther("0.005") // Kirim 0.005 ETH modal transaksi
          });
          await txGas.wait();
        }

        // B. Registrasi On-Chain ke Smart Contract
        const registered = await registry.isRegistered(phoneHash);
        if (!registered) {
          console.log(`⛓️ [BG] Registering ${formattedPhone} on-chain...`);
          const txReg = await registry.register(phoneHash, walletAddress);
          await txReg.wait();
        }

        // C. Auto-Approve IDRX (Biar transfer lancar)
        const userWallet = new ethers.Wallet(privKey, provider);
        const idrx = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, userWallet);
        const allowance = await idrx.allowance(walletAddress, CONTRACTS.REGISTRY_ADDRESS);
        
        if (allowance < ethers.parseUnits("1000000", 6)) { // Jika izin kurang dari 1jt IDRX
          console.log(`🔓 [BG] Auto-approving IDRX...`);
          const appTx = await idrx.approve(CONTRACTS.REGISTRY_ADDRESS, ethers.MaxUint256);
          await appTx.wait();
        }
        
        console.log(`✅ [BG] Setup Selesai untuk ${formattedPhone}`);
      } catch (e) {
        console.error('❌ [BG Error]:', e);
      }
    })();

    // 4. Respon Instan ke Frontend
    return NextResponse.json({
      success: true,
      message: isNew ? 'Wallet created and setup started!' : 'Welcome back!',
      walletAddress,
      isNewRegistration: isNew
    });

  } catch (err: any) {
    console.error('❌ [VerifyOTP API] Global Error:', err);
    return NextResponse.json({ error: 'Gagal memproses verifikasi' }, { status: 500 });
  }
}
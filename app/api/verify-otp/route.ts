import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { encrypt } from '@/utils/encrypt'; // Pastikan utilitas enkripsi tersedia

// Helper untuk menormalkan nomor HP agar sesuai dengan format database/Fonnte
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Nomor HP dan OTP wajib diisi' },
        { status: 400 }
      );
    }

    const formattedPhone = normalizePhone(phone);
    console.log('🔐 [VerifyOTP API] Verifying OTP for:', formattedPhone);

    // Inisialisasi Supabase Admin untuk akses tabel kustom
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verifikasi OTP dari tabel otp_verifications
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('is_used', false)
      .gt('expired_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      console.error('❌ [VerifyOTP API] OTP invalid atau expired');
      return NextResponse.json(
        { error: 'Kode OTP salah atau sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    // 2. Tandai OTP sudah digunakan agar tidak bisa dipakai ulang
    await supabaseAdmin
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', otpData.id);

    console.log('✅ [VerifyOTP API] OTP verified successfully');

    // 3. Logika Pembuatan Dompet Kripto (Ethers.js)
    const randomPrivateKey = ethers.hexlify(ethers.randomBytes(32));
    const wallet = new ethers.Wallet(randomPrivateKey);
    const walletAddress = wallet.address;
    const phoneHash = hashPhoneNumber(formattedPhone);

    // 4. Registrasi On-Chain ke Smart Contract
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
    );
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) throw new Error('ADMIN_PRIVATE_KEY belum dikonfigurasi');

    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
    const registry = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      adminSigner
    );

    // Cek apakah sudah terdaftar di blockchain
    const alreadyRegistered = await registry.isRegistered(phoneHash);
    let txHash = null;

    if (!alreadyRegistered) {
      console.log('📝 [VerifyOTP API] Registering new wallet on-chain...');
      const tx = await registry.register(phoneHash, walletAddress);
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } else {
      console.log('⚠️ [VerifyOTP API] Phone hash already registered on-chain');
    }

    // 5. Sinkronisasi ke tabel profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', formattedPhone)
      .maybeSingle();

    let userId;

    if (!existingProfile) {
      userId = crypto.randomUUID();
      
      // Enkripsi Private Key sebelum disimpan demi keamanan
      const encryptedData = encrypt(randomPrivateKey);

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: userId,
          phone_number: formattedPhone,
          phone_hash: phoneHash,
          wallet_address: walletAddress,
          encrypted_private_key: encryptedData.encryptedData,
          encryption_iv: encryptedData.iv,
          auth_tag: encryptedData.authTag,
          is_verified: true,
          created_at: new Date().toISOString()
        }]);

      if (profileError) {
        console.error('❌ [VerifyOTP API] Profile creation error:', profileError.message);
        throw profileError;
      }
    } else {
      userId = existingProfile.id;
    }

    return NextResponse.json({
      success: true,
      message: alreadyRegistered ? 'Welcome back!' : 'Wallet created and registered',
      phone: formattedPhone,
      walletAddress: alreadyRegistered ? await registry.getAccount(phoneHash) : walletAddress,
      isNewRegistration: !alreadyRegistered,
      txHash: txHash
    });

  } catch (err: any) {
    console.error('❌ [VerifyOTP API] Global Error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memverifikasi OTP' },
      { status: 500 }
    );
  }
}
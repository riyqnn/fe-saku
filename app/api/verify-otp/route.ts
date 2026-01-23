import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';
import { hashPhoneNumber } from '@/utils/phoneHash';

// Helper to normalize phone number
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  } else if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  return '+' + normalized;
}

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone and OTP required' },
        { status: 400 }
      );
    }

    console.log('🔐 [VerifyOTP API] Verifying OTP');
    console.log('📱 [VerifyOTP API] Phone:', phone);
    console.log('🔑 [VerifyOTP API] OTP Code:', otp);

    const formattedPhone = normalizePhone(phone);
    console.log('📋 [VerifyOTP API] Formatted phone:', formattedPhone);

    // Verify OTP with Supabase (the code that was sent via SMS)
    console.log('🔐 [VerifyOTP API] Verifying OTP with Supabase...');

    const cookieStore = await cookies();

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
            } catch {}
          },
        },
      }
    );

    // Verify OTP code with Supabase
    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (verifyError) {
      console.error('❌ [VerifyOTP API] Supabase OTP verification failed:', verifyError.message);
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error('❌ [VerifyOTP API] No user returned from OTP verification');
      return NextResponse.json(
        { error: 'OTP verification failed' },
        { status: 400 }
      );
    }

    console.log('✅ [VerifyOTP API] OTP verified successfully with Supabase!');

    // OTP is valid! Now generate wallet on-chain
    console.log('🔐 [VerifyOTP API] Generating wallet from private key...');

    // Generate random private key using ethers (CSPRNG - cryptographically secure)
    const randomPrivateKey = ethers.hexlify(ethers.randomBytes(32));
    console.log('🔑 [VerifyOTP API] Private key generated');

    // Create wallet from private key
    const wallet = new ethers.Wallet(randomPrivateKey);
    const walletAddress = wallet.address;
    console.log('👛 [VerifyOTP API] Wallet created:', walletAddress);

    // Hash phone number for contract registration
    const phoneHash = hashPhoneNumber(formattedPhone);
    console.log('🔐 [VerifyOTP API] Phone hash:', phoneHash);

    // Register on-chain using the smart contract
    console.log('📝 [VerifyOTP API] Registering wallet on-chain...');

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
      );

      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!adminPrivateKey) {
        throw new Error('ADMIN_PRIVATE_KEY not configured');
      }

      const adminSigner = new ethers.Wallet(adminPrivateKey, provider);
      console.log('👤 [VerifyOTP API] Admin signer:', adminSigner.address);

      // Create registry contract instance
      const registry = new ethers.Contract(
        CONTRACTS.REGISTRY_ADDRESS,
        SAKU_REGISTRY_ABI,
        adminSigner
      );

      // Check if already registered
      const alreadyRegistered = await registry.isRegistered(phoneHash);
      if (alreadyRegistered) {
        console.log('⚠️ [VerifyOTP API] Phone already registered');
        const existingAddress = await registry.getAccount(phoneHash);
        
        return NextResponse.json({
          success: true,
          message: 'Phone already registered on-chain',
          phone: formattedPhone,
          walletAddress: existingAddress,
          isNewRegistration: false,
        });
      }

      // Call register function on smart contract
      console.log('📝 [VerifyOTP API] Calling smart contract register...');
      const tx = await registry.register(phoneHash, walletAddress);

      console.log('⏳ [VerifyOTP API] Waiting for transaction confirmation...');
      console.log('   TX Hash:', tx.hash);

      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed - no receipt');
      }

      console.log('✅ [VerifyOTP API] On-chain registration successful');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas Used:', receipt.gasUsed.toString());

      console.log('🎉 [VerifyOTP API] OTP verification and on-chain registration complete!');

      const walletCreatedAt = Date.now();

      return NextResponse.json({
        success: true,
        message: 'OTP verified and wallet registered on-chain',
        phone: formattedPhone,
        walletAddress: walletAddress,
        privateKey: randomPrivateKey,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        isNewRegistration: true,
        walletCreatedAt: walletCreatedAt,
      });
    } catch (chainError: any) {
      console.error('❌ [VerifyOTP API] On-chain registration error:', chainError.message);

      throw chainError;
    }
  } catch (err: any) {
    console.error('❌ [VerifyOTP API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}

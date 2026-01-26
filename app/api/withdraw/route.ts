import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

// Normalize phone to match registration format
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, ''); // Remove all non-digits
  if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1);
  return normalized;
}

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // 1. Check Auth Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Read request body
    const { phoneNumber, toAddress, amount, withdrawAll } = await req.json();

    if (!phoneNumber || !toAddress) {
      return NextResponse.json({ error: 'Missing required fields: phoneNumber, toAddress' }, { status: 400 });
    }

    if (!amount && !withdrawAll) {
      return NextResponse.json({ error: 'Either amount or withdrawAll flag is required' }, { status: 400 });
    }

    // Validate destination address
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 });
    }

    // 3. Get user's profile with encrypted private key
    const normalizedPhone = normalizePhone(phoneNumber);

    console.log('=== WITHDRAW DEBUG ===');
    console.log('Input phone:', phoneNumber);
    console.log('Normalized phone:', normalizedPhone);

    // First, get the profile by phone_number to get the stored phone_hash
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, encrypted_private_key, encryption_iv, auth_tag, phone_hash')
      .eq('phone_number', normalizedPhone)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      console.error('Looking for phone:', normalizedPhone);
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (!profile.wallet_address) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 400 });
    }

    console.log('DB wallet_address:', profile.wallet_address);
    console.log('DB phone_hash:', profile.phone_hash);

    // Use the phone_hash from database (ensures it matches what was registered)
    const phoneHash = profile.phone_hash;

    // 4. Decrypt private key server-side
    let privateKey: string;
    try {
      privateKey = decrypt(
        profile.encrypted_private_key,
        profile.encryption_iv,
        profile.auth_tag
      );
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return NextResponse.json({ error: 'Failed to decrypt private key' }, { status: 500 });
    }

    // 5. Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('Wallet address from private key:', wallet.address);
    console.log('Phone hash being used:', phoneHash);
    console.log('Do they match?', wallet.address === profile.wallet_address);

    // 6. Setup contract instances
    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      wallet
    );

    // Check what the contract has for this phoneHash
    const contractOwner = await registryContract.phoneToAccount(phoneHash);
    console.log('Contract owner for phoneHash:', contractOwner);
    console.log('Contract owner == wallet?', contractOwner.toLowerCase() === wallet.address.toLowerCase());

    const idrxContract = new ethers.Contract(
      CONTRACTS.IDRX_ADDRESS,
      IDRX_ABI,
      wallet
    );

    // 7. Check and handle approval if needed (withdrawals need approval)
    let amountBigInt = BigInt(0);

    if (withdrawAll) {
      // Get balance to approve for maximum
      const balance = await idrxContract.balanceOf(wallet.address);
      amountBigInt = balance;
    } else if (amount) {
      amountBigInt = ethers.parseUnits(amount, 6);
    }

    let approvalTxHash: string | undefined;

    if (amountBigInt > BigInt(0)) {
      const allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);

      if (allowance < amountBigInt) {
        // Approve unlimited
        const approveTx = await idrxContract.approve(
          CONTRACTS.REGISTRY_ADDRESS,
          ethers.MaxUint256
        );
        const approveReceipt = await approveTx.wait();
        approvalTxHash = approveReceipt?.hash;
      }
    }

    // 8. Execute withdrawal
    let receipt;
    if (withdrawAll) {
      const tx = await registryContract.withdrawAll(phoneHash, toAddress);
      receipt = await tx.wait();
    } else {
      const tx = await registryContract.withdraw(phoneHash, toAddress, amountBigInt);
      receipt = await tx.wait();
    }

    // 9. Parse Withdrawn event to get exact fee and amounts
    let withdrawnAmount = BigInt(0);
    let fee = BigInt(0);

    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = registryContract.interface.parseLog(log);
          if (parsed && parsed.name === 'Withdrawn') {
            withdrawnAmount = parsed.args.amount || BigInt(0);
            fee = parsed.args.fee || BigInt(0);
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }
    }

    const amountAfterFee = withdrawnAmount - fee;

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amount: ethers.formatUnits(withdrawnAmount, 6),
      fee: ethers.formatUnits(fee, 6),
      amountAfterFee: ethers.formatUnits(amountAfterFee, 6),
      approvalTxHash,
    });

  } catch (error: any) {
    console.error('Withdraw Error:', error);
    return NextResponse.json({
      error: error.message || 'Withdrawal failed'
    }, { status: 500 });
  }
}

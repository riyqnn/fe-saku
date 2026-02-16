import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // 1. Auth Check
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Read Request
    // qrHash didapat dari hasil scan kamera atau upload file di frontend
    const { phoneNumber, qrHash } = await req.json();

    if (!phoneNumber || !qrHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payerPhoneHash = hashPhoneNumber(phoneNumber);

    // 3. Get Payer's Profile (Orang yang lagi megang HP/Scanner)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_address, encrypted_private_key, encryption_iv, auth_tag, phone_number, full_name')
      .eq('phone_hash', payerPhoneHash)
      .single();

    if (profileError || !profile) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

    // 4. Decrypt Private Key
    const privateKey = decrypt(
      profile.encrypted_private_key,
      profile.encryption_iv,
      profile.auth_tag
    );

    // 5. Blockchain Setup
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const registryContract = new ethers.Contract(CONTRACTS.REGISTRY_ADDRESS, SAKU_REGISTRY_ABI, wallet);

    // 6. Execute Blockchain Claim
    const tx = await registryContract.claimQRPayment(qrHash);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) throw new Error('On-chain transaction failed');

    // 7. Parse Event to get details
    let claimedAmount = BigInt(0);
    let merchantHash = '';
    for (const log of receipt.logs) {
      try {
        const parsed = registryContract.interface.parseLog(log);
        if (parsed && parsed.name === 'QRPaymentClaimed') {
          claimedAmount = parsed.args.amount;
          merchantHash = parsed.args.merchantHash;
          break;
        }
      } catch (e) { continue; }
    }

    const formattedAmount = ethers.formatUnits(claimedAmount, 6);

    // 8. Get merchant profile for notification and history
    const { data: merchantProfile } = await supabase
      .from('profiles')
      .select('id, phone_number, wallet_address, full_name')
      .eq('phone_hash', merchantHash)
      .single();

    // 9. Sync to Database
    await supabase.from('transactions').insert({
        sender_phone: profile.phone_number,
        receiver_phone: merchantProfile?.phone_number || 'Unknown Merchant',
        sender_wallet: wallet.address.toLowerCase(),
        receiver_wallet: merchantProfile?.wallet_address?.toLowerCase() || '0x',
        amount: parseFloat(formattedAmount),
        tx_hash: receipt.hash,
        block_number: receipt.blockNumber,
        type: 'QR_PAYMENT',
        timestamp: new Date().toISOString()
      });

    // 10. Create notifications
    const payerName = profile.full_name || `User ...${profile.phone_number.slice(-4)}`;
    const merchantName = merchantProfile?.full_name || 'Saku Merchant';

    if (merchantProfile) {
      await Promise.all([
        // Notification for payer
        supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'TRANSFER_OUT',
          message: `You paid ${formattedAmount} USDC to ${merchantName}.`,
          metadata: {
            amount: parseFloat(formattedAmount),
            tx_hash: receipt.hash,
            to_name: merchantName,
          },
        }),
        // Notification for merchant
        supabase.from('notifications').insert({
          user_id: merchantProfile.id,
          type: 'TRANSFER_IN',
          message: `You received a QR payment of ${formattedAmount} USDC from ${payerName}.`,
          metadata: {
            amount: parseFloat(formattedAmount),
            tx_hash: receipt.hash,
            from_name: payerName,
          },
        }),
      ]);
    }
    
    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      amount: formattedAmount,
      merchantName: merchantName,
      type: 'QR_PAYMENT'
    });

  } catch (error: any) {
    console.error("QR Claim Fatal Error:", error);
    return NextResponse.json({ error: error.message || 'QR Payment failed' }, { status: 500 });
  }
}
import { createSakuServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { hashPhoneNumber } from '@/utils/phoneHash';
import { decrypt } from '@/utils/encrypt';
import { SAKU_REGISTRY_ABI, IDRX_ABI } from '@/lib/abi';
import { CONTRACTS } from '@/lib/config';

export async function POST(req: Request) {
  const supabase = await createSakuServerClient();

  try {
    // 1. Check Auth Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Read request body
    const { phoneNumber, receiverPhone, amount } = await req.json();

    if (!phoneNumber || !receiverPhone || !amount) {
      return NextResponse.json({ error: 'Missing required fields: phoneNumber, receiverPhone, amount' }, { status: 400 });
    }

    // 3. Get sender's profile with encrypted private key
    const phoneHash = hashPhoneNumber(phoneNumber);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, encrypted_private_key, encryption_iv, auth_tag')
      .eq('phone_hash', phoneHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (!profile.wallet_address) {
      return NextResponse.json({ error: 'Wallet address not found' }, { status: 400 });
    }

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

    // 6. Setup contract instances
    console.log('[Transfer] Using IDRX address:', CONTRACTS.IDRX_ADDRESS);
    console.log('[Transfer] Using Registry address:', CONTRACTS.REGISTRY_ADDRESS);
    console.log('[Transfer] Wallet address:', wallet.address);

    const registryContract = new ethers.Contract(
      CONTRACTS.REGISTRY_ADDRESS,
      SAKU_REGISTRY_ABI,
      wallet
    );

    const idrxContract = new ethers.Contract(
      CONTRACTS.IDRX_ADDRESS,
      IDRX_ABI,
      wallet
    );

    // Verify the registry's internal IDRX address matches our config
    const registryIdrxAddress = await registryContract.idrxToken();
    console.log('[Transfer] Registry internal IDRX address:', registryIdrxAddress);

    if (registryIdrxAddress.toLowerCase() !== CONTRACTS.IDRX_ADDRESS.toLowerCase()) {
      console.error('[Transfer] MISMATCH! Registry expects:', registryIdrxAddress, 'but we are using:', CONTRACTS.IDRX_ADDRESS);
      throw new Error(`IDRX address mismatch. Registry expects ${registryIdrxAddress} but config has ${CONTRACTS.IDRX_ADDRESS}`);
    }

    // 7. Hash receiver phone number and check balance
    const receiverHash = hashPhoneNumber(receiverPhone);
    const amountBigInt = ethers.parseUnits(amount, 6);

    // Check if receiver is registered
    const receiverAddress = await registryContract.getAccount(receiverHash);
    console.log('[Transfer] Receiver phone:', receiverPhone);
    console.log('[Transfer] Receiver hash:', receiverHash);
    console.log('[Transfer] Receiver address:', receiverAddress);

    if (receiverAddress === ethers.ZeroAddress) {
      return NextResponse.json({
        error: `Receiver with phone number ${receiverPhone} is not registered`
      }, { status: 400 });
    }

    // Check user's IDRX balance
    const balance = await idrxContract.balanceOf(wallet.address);
    console.log('[Transfer] User balance:', ethers.formatUnits(balance, 6), 'IDRX');
    console.log('[Transfer] Amount to transfer:', ethers.formatUnits(amountBigInt, 6), 'IDRX');

    if (balance < amountBigInt) {
      return NextResponse.json({
        error: `Insufficient balance. You have ${ethers.formatUnits(balance, 6)} IDRX but trying to transfer ${ethers.formatUnits(amountBigInt, 6)} IDRX`
      }, { status: 400 });
    }

    // 8. Check and handle approval if needed
    let approvalTxHash: string | undefined;
    let allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);

    console.log('[Transfer] Initial allowance:', allowance.toString());
    console.log('[Transfer] Amount to transfer:', amountBigInt.toString());

    if (allowance < amountBigInt) {
      console.log('[Transfer] Approving unlimited...');

      // Approve unlimited
      const approveTx = await idrxContract.approve(
        CONTRACTS.REGISTRY_ADDRESS,
        ethers.MaxUint256
      );
      console.log('[Transfer] Approval tx hash:', approveTx.hash);
      console.log('[Transfer] Waiting for approval confirmation...');

      const approveReceipt = await approveTx.wait();
      approvalTxHash = approveReceipt?.hash;

      console.log('[Transfer] Approval confirmed, block:', approveReceipt?.blockNumber);
      console.log('[Transfer] Approval status:', approveReceipt?.status);

      // Check if the approval transaction was successful
      if (approveReceipt?.status !== 1) {
        throw new Error('Approval transaction failed on-chain');
      }

      // Wait a bit for the state to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify the allowance was updated with retry logic
      let retries = 5;
      for (let i = 0; i < retries; i++) {
        allowance = await idrxContract.allowance(wallet.address, CONTRACTS.REGISTRY_ADDRESS);
        console.log(`[Transfer] Check ${i + 1}/${retries}: New allowance after approval:`, allowance.toString());

        if (allowance >= amountBigInt) {
          console.log('[Transfer] ✓ Allowance verified successfully!');
          break;
        }

        if (i < retries - 1) {
          console.log('[Transfer] Allowance not updated yet, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`Approval failed after ${retries} retries. Allowance is ${allowance.toString()}, need ${amountBigInt.toString()}`);
        }
      }
    }

    // 9. Execute transferIDRX
    console.log('[Transfer] Executing transferIDRX...');
    const tx = await registryContract.transferIDRX(receiverHash, amountBigInt);
    console.log('[Transfer] Transfer tx hash:', tx.hash);

    const receipt = await tx.wait();
    console.log('[Transfer] Transfer confirmed, block:', receipt.blockNumber);

    // 10. Parse Transferred event for confirmation
    let transferredAmount = BigInt(0);
    let transferredTo = '';

    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = registryContract.interface.parseLog(log);
          if (parsed && parsed.name === 'Transferred') {
            transferredAmount = parsed.args.amount || BigInt(0);
            transferredTo = parsed.args.receiver || '';
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amount: ethers.formatUnits(transferredAmount, 6),
      transferredTo,
      approvalTxHash,
    });

  } catch (error: any) {
    console.error('Transfer By Phone Error:', error);
    return NextResponse.json({
      error: error.message || 'Transfer failed'
    }, { status: 500 });
  }
}

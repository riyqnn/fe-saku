import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createSakuServerClient } from "@/lib/supabaseServer";
import { CONTRACTS, NETWORK_CONFIG, IDRX_DECIMALS } from "@/lib/config";
import { SAKU_REGISTRY_ABI, IDRX_ABI } from "@/lib/abi";
import { toTokenAmount } from "@/lib/blockchain";
import { hashPhoneNumber } from "@/utils/phoneHash";
import { decrypt } from "@/utils/encrypt";
import { validateAuth } from "@/lib/auth-middleware";

/**
 * POST /api/transfer
 * Transfer IDRX tokens to another wallet address or phone number
 *
 * Body:
 * - receiverAddress: address of the receiver (optional if receiverPhone provided)
 * - receiverPhone: phone number of the receiver (optional if receiverAddress provided)
 * - amount: amount to transfer (in IDRX units)
 *
 * Authentication: Bearer token from JWT (phone number extracted from token)
 */
export async function POST(request: NextRequest) {
  const supabase = await createSakuServerClient();

  try {
    // Validate JWT Token
    const auth = await validateAuth(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { receiverAddress, receiverPhone, amount } = body;
    const phoneNumber = auth.phone!; // From JWT token

    if (!amount) {
      return NextResponse.json({ error: "Missing required field: amount" }, { status: 400 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Get sender's profile
    const { data: senderProfile, error: senderProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, wallet_address, full_name, encrypted_private_key, encryption_iv, auth_tag")
      .eq("phone_number", phoneNumber)
      .single();

    if (senderProfileError || !senderProfile) {
      return NextResponse.json({ error: "Sender wallet not found" }, { status: 404 });
    }

    // Get receiver's profile
    let receiverProfile: any = null;
    if (receiverPhone) {
      const { data } = await supabaseAdmin.from("profiles").select("id, wallet_address, full_name").eq("phone_number", receiverPhone).single();
      receiverProfile = data;
    } else if (receiverAddress) {
      const { data } = await supabaseAdmin.from("profiles").select("id, wallet_address, full_name").eq("wallet_address", receiverAddress).single();
      receiverProfile = data;
    }

    if (!receiverProfile || !receiverProfile.wallet_address) {
      return NextResponse.json({ error: "Receiver wallet not found" }, { status: 404 });
    }

    const finalReceiverAddress = receiverProfile.wallet_address;

    if (senderProfile.wallet_address.toLowerCase() === finalReceiverAddress.toLowerCase()) {
      return NextResponse.json({ error: "Cannot transfer to the same address" }, { status: 400 });
    }

    // Decrypt sender's private key
    const privateKey = decrypt(senderProfile.encrypted_private_key, senderProfile.encryption_iv, senderProfile.auth_tag);
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    if (signer.address.toLowerCase() !== senderProfile.wallet_address.toLowerCase()) {
      return NextResponse.json({ error: "Private key does not match wallet address" }, { status: 401 });
    }

    const transferAmount = toTokenAmount(amount, IDRX_DECIMALS);
    const idrxContract = new ethers.Contract(CONTRACTS.IDRX_ADDRESS, IDRX_ABI, signer);

    const balance = await idrxContract.balanceOf(senderProfile.wallet_address);
    if (balance < transferAmount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const tx = await idrxContract.transfer(finalReceiverAddress, transferAmount);
    const receipt = await tx.wait();

    if (!receipt) {
      return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
    }

    const senderName = senderProfile.full_name || `User ending in ...${phoneNumber.slice(-4)}`;
    const receiverName = receiverProfile.full_name || `User at ...${finalReceiverAddress.slice(-4)}`;

    // Insert transaction record
    await supabaseAdmin.from('transactions').insert({
      sender_phone: phoneNumber,
      sender_wallet: senderProfile.wallet_address,
      receiver_phone: receiverProfile.phone_number,
      receiver_wallet: finalReceiverAddress,
      amount: parseFloat(amount),
      tx_hash: receipt.hash,
      type: 'TRANSFER',
    });

    // Create notifications for both parties
    await Promise.all([
      supabaseAdmin.from('notifications').insert({
        user_id: senderProfile.id,
        type: 'TRANSFER_OUT',
        message: `You sent ${amount} USDC to ${receiverName}.`,
        metadata: {
          amount: parseFloat(amount),
          tx_hash: receipt.hash,
          to_name: receiverName,
          to_address: finalReceiverAddress,
        },
      }),
      supabaseAdmin.from('notifications').insert({
        user_id: receiverProfile.id,
        type: 'TRANSFER_IN',
        message: `You received ${amount} USDC from ${senderName}.`,
        metadata: {
          amount: parseFloat(amount),
          tx_hash: receipt.hash,
          from_name: senderName,
          from_address: senderProfile.wallet_address,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      from: signer.address,
      to: finalReceiverAddress,
      amount: amount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Transfer failed: ${message}` },
      { status: 500 }
    );
  }
}

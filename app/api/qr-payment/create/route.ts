
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(req: Request) {
  try {
    const { amount, merchantPhone } = await req.json();

    if (!amount || !merchantPhone) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const qrHash = ethers.solidityPackedKeccak256(
      ["string", "uint256", "bytes32"],
      [merchantPhone, ethers.parseUnits(amount.toString(), 6), nonce]
    );

    return NextResponse.json({
      success: true,
      qrHash,
      merchantPhone,
      amount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
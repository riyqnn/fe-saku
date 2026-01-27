import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Log dulu semua event dari Farcaster
    console.log("🔔 Farcaster Webhook Event:", JSON.stringify(body, null, 2));

    // Jangan lakukan transfer / logic uang dulu
    // Cukup acknowledge bahwa event diterima
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { ok: false, error: "Invalid webhook payload" },
      { status: 400 }
    );
  }
}
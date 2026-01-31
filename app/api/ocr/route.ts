import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: "API Key is missing" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze this receipt image. Extract:
      1. All line items with their name, unit price, and quantity (qty).
      2. Total tax (PPN, Service Charge, etc).
      3. Total discount (if any).

      Return ONLY a strict JSON object:
      {
        "items": [{"name": "Item Name", "price": 15000, "qty": 2}],
        "totalTax": 5000,
        "totalDiscount": 0
      }
      If qty is not found, assume 1. Return ONLY raw JSON.
    `;

    const base64Content = image.split(",")[1];
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Content, mimeType: "image/jpeg" } },
    ]);

    const response = await result.response;
    let text = response.text().trim().replace(/```json|```/g, "");
    
    const data = JSON.parse(text);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
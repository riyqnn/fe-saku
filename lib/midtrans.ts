import crypto from 'crypto';

export interface MidtransTransactionDetails {
  order_id: string;
  gross_amount: number;
}

export interface MidtransCustomerDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface MidtransItemDetails {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface MidtransTransactionRequest {
  transaction_details: MidtransTransactionDetails;
  customer_details: MidtransCustomerDetails;
  item_details: MidtransItemDetails[];
  payment_type?: string;
  enabled_payments?: string[];
}

export interface MidtransResponse {
  token: string;
  redirect_url: string;
}

export async function createMidtransTransaction(
  params: MidtransTransactionRequest
): Promise<MidtransResponse> {
  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? process.env.MIDTRANS_PRODUCTION_URL!
    : process.env.MIDTRANS_SANDBOX_URL!;
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;

  const response = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Midtrans transaction');
  }

  return response.json();
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');

  return signatureKey === expectedSignature;
}

export function idrxToIdr(idrxAmount: number): number {
  return Math.round(idrxAmount);
}

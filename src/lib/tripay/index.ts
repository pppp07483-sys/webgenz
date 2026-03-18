import crypto from 'crypto';

// Tripay Payment Gateway Integration
// Daftar di https://tripay.co.id untuk mendapatkan API Key

// Config - Ganti dengan API Key Anda dari Tripay
const TRIPAY_CONFIG = {
  apiKey: process.env.TRIPAY_API_KEY || 'DEV-YourApiKeyHere',
  privateKey: process.env.TRIPAY_PRIVATE_KEY || 'your-private-key',
  merchantCode: process.env.TRIPAY_MERCHANT_CODE || 'your-merchant-code',
};

// Dana account untuk fallback manual
export const DANA_ACCOUNT = {
  number: '083833728994',
  name: 'Kasilah'
};

export interface TripayTransaction {
  merchant_ref: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  order_items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  callback_url: string;
  return_url: string;
  expired_time: number;
}

export interface TripayResponse {
  success: boolean;
  data?: {
    transaction_id: string;
    merchant_ref: string;
    payment_type: string;
    payment_name: string;
    qr_string: string;
    qr_url: string;
    pay_url: string;
    amount: number;
    fee: number;
    total_amount: number;
    expired_time: number;
  };
  message?: string;
}

// Create QRIS Transaction
export async function createQRISTransaction(data: TripayTransaction): Promise<TripayResponse> {
  try {
    const response = await fetch('https://payment.tripay.co.id/api-sandbox/transaction/create', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TRIPAY_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'QRIS',
        merchant_ref: data.merchant_ref,
        amount: data.amount,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        order_items: data.order_items,
        callback_url: data.callback_url,
        return_url: data.return_url,
        expired_time: data.expired_time,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Tripay API Error:', error);
    return { success: false, message: 'Failed to create transaction' };
  }
}

// Check Transaction Status
export async function checkTransactionStatus(merchantRef: string): Promise<{
  success: boolean;
  status?: string;
  data?: Record<string, unknown>;
}> {
  try {
    const response = await fetch(
      `https://payment.tripay.co.id/api-sandbox/transaction/detail?merchant_ref=${merchantRef}`,
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + TRIPAY_CONFIG.apiKey,
        },
      }
    );

    const result = await response.json();
    return {
      success: result.success,
      status: result.data?.status,
      data: result.data,
    };
  } catch (error) {
    console.error('Check status error:', error);
    return { success: false };
  }
}

// Generate QRIS for demo (without Tripay API)
export function generateDemoQRIS(amount: number, refId: string): string {
  const qrisData = generateQRISString(amount);
  return `https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=${encodeURIComponent(qrisData)}&choe=UTF-8`;
}

function generateQRISString(amount: number): string {
  const danaAccount = DANA_ACCOUNT.number;
  const qris = `00020101021126610016ID.DANA.WWW01189360085300${danaAccount}0215${danaAccount}0303UMI51440014ID.CO.QRIS.WWW0215ID20200277595810303UMI520483995303360540${amount}5802ID5913${DANA_ACCOUNT.name.toUpperCase()}6007JAKARTA61051234062070703A016304`;
  return qris;
}

// Verify Tripay Webhook Signature
export function verifyWebhookSignature(callbackSignature: string, jsonBody: string): boolean {
  const privateKey = TRIPAY_CONFIG.privateKey;
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(jsonBody)
    .digest('hex');
  
  return signature === callbackSignature;
}

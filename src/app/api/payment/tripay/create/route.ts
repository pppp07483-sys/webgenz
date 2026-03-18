import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Tripay Configuration - SANDBOX MODE
const TRIPAY_CONFIG = {
  merchantCode: process.env.TRIPAY_MERCHANT_CODE || 'T49920',
  apiKey: process.env.TRIPAY_API_KEY || '',
  privateKey: process.env.TRIPAY_PRIVATE_KEY || '',
  baseUrl: 'https://tripay.co.id/api-sandbox'
};

// Coin packages
const COIN_PACKAGES = [
  { coins: 1, price: 2000 },
  { coins: 5, price: 10000 },
  { coins: 10, price: 20000 },
  { coins: 25, price: 50000 },
  { coins: 50, price: 100000 },
  { coins: 100, price: 200000 },
];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { packageIndex } = await request.json();
    
    if (packageIndex < 0 || packageIndex >= COIN_PACKAGES.length) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }
    
    const selectedPackage = COIN_PACKAGES[packageIndex];
    
    // Check if Tripay credentials are configured
    if (!TRIPAY_CONFIG.apiKey || !TRIPAY_CONFIG.privateKey) {
      console.log('[Tripay] Credentials not configured, using demo mode');
      return NextResponse.json({ 
        error: 'Payment gateway belum dikonfigurasi. Hubungi admin.',
        demo: true
      }, { status: 400 });
    }
    
    const merchantRef = `COIN-${Date.now()}-${user.userId}`;
    
    // Create signature
    const signature = crypto
      .createHmac('sha256', TRIPAY_CONFIG.privateKey)
      .update(TRIPAY_CONFIG.merchantCode + merchantRef + selectedPackage.price.toString())
      .digest('hex');
    
    console.log('[Tripay] Creating transaction:', {
      merchantRef,
      amount: selectedPackage.price,
      coins: selectedPackage.coins
    });
    
    // Create transaction in Tripay
    const response = await fetch(`${TRIPAY_CONFIG.baseUrl}/transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TRIPAY_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'QRIS',
        merchant_ref: merchantRef,
        amount: selectedPackage.price,
        customer_name: user.name || `User ${user.userId}`,
        customer_email: user.email,
        customer_phone: user.phone || '',
        order_items: [{
          name: `${selectedPackage.coins} Koin - space.z.ai`,
          price: selectedPackage.price,
          quantity: 1
        }],
        expired_time: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
        signature: signature
      })
    });
    
    const data = await response.json();
    
    console.log('[Tripay] Response:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.error('[Tripay] Error:', data.message);
      return NextResponse.json({ 
        error: data.message || 'Gagal membuat transaksi pembayaran' 
      }, { status: 400 });
    }
    
    // Save transaction to database
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: 'PURCHASE',
        coinAmount: selectedPackage.coins,
        priceAmount: selectedPackage.price,
        paymentMethod: 'QRIS',
        paymentStatus: 'PENDING',
        paymentRef: data.data.reference,
        qrisUrl: data.data.qr_url,
        expiredAt: new Date(data.data.expired_time * 1000)
      }
    });
    
    console.log('[Tripay] Transaction saved:', transaction.id);
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        reference: data.data.reference,
        merchantRef: merchantRef,
        qrUrl: data.data.qr_url,
        qrString: data.data.qr_string,
        amount: selectedPackage.price,
        coins: selectedPackage.coins,
        expiredAt: data.data.expired_time * 1000,
        expiredTime: data.data.expired_time
      }
    });
    
  } catch (error) {
    console.error('[Tripay] Error:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan server' 
    }, { status: 500 });
  }
}

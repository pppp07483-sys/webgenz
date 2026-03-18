import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateDemoQRIS, DANA_ACCOUNT } from '@/lib/tripay';

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
    const merchantRef = `COIN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create transaction in database
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: 'PURCHASE',
        coinAmount: selectedPackage.coins,
        priceAmount: selectedPackage.price,
        paymentMethod: 'QRIS',
        paymentStatus: 'PENDING',
        paymentRef: merchantRef,
        expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      }
    });
    
    // Generate QRIS URL
    const qrisUrl = generateDemoQRIS(selectedPackage.price, merchantRef);
    
    // Update transaction with QRIS URL
    await db.transaction.update({
      where: { id: transaction.id },
      data: { qrisUrl }
    });
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        merchantRef,
        coinAmount: selectedPackage.coins,
        priceAmount: selectedPackage.price,
        qrisUrl,
        expiredAt: transaction.expiredAt,
        danaAccount: DANA_ACCOUNT
      }
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

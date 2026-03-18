import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Coin packages
const COIN_PACKAGES = [
  { coins: 1, price: 2000 },
  { coins: 5, price: 10000 },
  { coins: 10, price: 20000 },
  { coins: 25, price: 50000 },
  { coins: 50, price: 100000 },
  { coins: 100, price: 200000 },
];

// Dana account info
const DANA_ACCOUNT = {
  number: '083833728994',
  name: 'Kasilah'
};

// Generate QRIS URL (simulated - in production, use payment gateway API)
function generateQRISUrl(amount: number, refId: string): string {
  // In production, this would call Tripay/Midtrans/Xendit API
  // For demo, we return a placeholder QRIS data
  const qrisData = `00020101021126610016ID.DANA.WWW01189360085300838337289940215210838337289940303UMI51440014ID.CO.QRIS.WWW0215ID20200277595810303UMI520483995303360540${amount}5802ID5913KASILAH6007JAKARTA61051234062070703A016304`;
  return `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(qrisData)}&choe=UTF-8`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const { packageIndex } = await request.json();
    
    // Validate package
    if (packageIndex < 0 || packageIndex >= COIN_PACKAGES.length) {
      return NextResponse.json(
        { error: 'Paket tidak valid' },
        { status: 400 }
      );
    }
    
    const selectedPackage = COIN_PACKAGES[packageIndex];
    
    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: 'PURCHASE',
        coinAmount: selectedPackage.coins,
        priceAmount: selectedPackage.price,
        paymentMethod: 'QRIS',
        paymentStatus: 'PENDING',
        expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      }
    });
    
    // Generate QRIS URL
    const qrisUrl = generateQRISUrl(selectedPackage.price, transaction.id);
    
    // Update transaction with QRIS URL
    await db.transaction.update({
      where: { id: transaction.id },
      data: { qrisUrl }
    });
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        coinAmount: selectedPackage.coins,
        priceAmount: selectedPackage.price,
        qrisUrl,
        expiredAt: transaction.expiredAt,
        danaAccount: DANA_ACCOUNT
      }
    });
    
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Get coin packages
export async function GET() {
  return NextResponse.json({
    packages: COIN_PACKAGES,
    danaAccount: DANA_ACCOUNT
  });
}

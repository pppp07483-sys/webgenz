import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        coinAmount: t.coinAmount,
        priceAmount: t.priceAmount,
        paymentMethod: t.paymentMethod,
        paymentStatus: t.paymentStatus,
        createdAt: t.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

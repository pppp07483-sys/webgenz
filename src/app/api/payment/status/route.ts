import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Check transaction status - for polling
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }
    
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id
      }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Check if expired
    if (transaction.expiredAt && new Date() > transaction.expiredAt && transaction.paymentStatus === 'PENDING') {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'EXPIRED' }
      });
      return NextResponse.json({
        status: 'EXPIRED',
        message: 'Transaction expired'
      });
    }
    
    return NextResponse.json({
      status: transaction.paymentStatus,
      coinAmount: transaction.coinAmount,
      paidAt: transaction.paidAt
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Simulate payment success (for demo only - remove in production)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { transactionId } = await request.json();
    
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
        paymentStatus: 'PENDING'
      }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found or already processed' }, { status: 404 });
    }
    
    // Simulate successful payment
    await db.$transaction([
      db.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: 'SUCCESS',
          paidAt: new Date()
        }
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          coins: { increment: transaction.coinAmount }
        }
      })
    ]);
    
    const updatedUser = await db.user.findUnique({
      where: { id: user.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Payment successful!',
      newBalance: updatedUser?.coins || 0
    });
    
  } catch (error) {
    console.error('Simulate payment error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

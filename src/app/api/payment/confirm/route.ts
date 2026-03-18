import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Handle payment confirmation - auto add coins to user account
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { transactionId } = await request.json();
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }
    
    // Find the pending transaction
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
        paymentStatus: 'PENDING'
      }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan atau sudah diproses' }, { status: 404 });
    }
    
    // Check if expired
    if (transaction.expiredAt && new Date() > transaction.expiredAt) {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'EXPIRED' }
      });
      return NextResponse.json({ error: 'Transaksi sudah expired' }, { status: 400 });
    }
    
    // Process payment confirmation - update transaction and add coins atomically
    const [updatedTransaction, updatedUser] = await db.$transaction([
      // Update transaction status
      db.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: 'SUCCESS',
          paidAt: new Date()
        }
      }),
      // Add coins to user
      db.user.update({
        where: { id: user.id },
        data: {
          coins: { increment: transaction.coinAmount }
        }
      })
    ]);
    
    console.log(`[Payment] Confirmed: ${transaction.id}, User: ${user.id}, Coins added: ${transaction.coinAmount}, New balance: ${updatedUser.coins}`);
    
    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil dikonfirmasi',
      transactionId: transaction.id,
      coinAmount: transaction.coinAmount,
      newBalance: updatedUser.coins
    });
    
  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

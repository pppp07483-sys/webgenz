import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// This endpoint simulates payment confirmation
// In production, this would be called by payment gateway webhook
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const { transactionId } = await request.json();
    
    // Find transaction
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
        paymentStatus: 'PENDING'
      }
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan atau sudah diproses' },
        { status: 400 }
      );
    }
    
    // Check if expired
    if (transaction.expiredAt && new Date() > transaction.expiredAt) {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'FAILED' }
      });
      return NextResponse.json(
        { error: 'Transaksi sudah kadaluarsa' },
        { status: 400 }
      );
    }
    
    // For demo: Auto-confirm payment
    // In production, this should be done via payment gateway webhook
    await db.$transaction([
      // Update transaction
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
    
    // Get updated user
    const updatedUser = await db.user.findUnique({
      where: { id: user.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil!',
      newBalance: updatedUser?.coins || 0
    });
    
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Check payment status
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID diperlukan' },
        { status: 400 }
      );
    }
    
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id
      }
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: transaction.paymentStatus,
      coinAmount: transaction.coinAmount
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

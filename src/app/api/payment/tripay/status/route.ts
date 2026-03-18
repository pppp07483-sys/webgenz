import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Tripay Configuration - SANDBOX MODE
const TRIPAY_CONFIG = {
  merchantCode: process.env.TRIPAY_MERCHANT_CODE || 'T49920',
  apiKey: process.env.TRIPAY_API_KEY || '',
  privateKey: process.env.TRIPAY_PRIVATE_KEY || '',
  baseUrl: 'https://tripay.co.id/api-sandbox'
};

// Check payment status
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const transactionId = searchParams.get('transactionId');
    
    if (!reference && !transactionId) {
      return NextResponse.json({ error: 'Reference or transaction ID required' }, { status: 400 });
    }
    
    // Find transaction in database
    const transaction = await db.transaction.findFirst({
      where: {
        OR: [
          { id: transactionId || '' },
          { paymentRef: reference || '' }
        ],
        userId: user.id
      }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Check if already paid
    if (transaction.paymentStatus === 'SUCCESS') {
      const userData = await db.user.findUnique({
        where: { id: user.id },
        select: { coins: true }
      });
      
      return NextResponse.json({
        status: 'PAID',
        transactionId: transaction.id,
        coins: transaction.coinAmount,
        newBalance: userData?.coins || 0
      });
    }
    
    // Check if expired
    if (transaction.expiredAt && new Date() > transaction.expiredAt) {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'EXPIRED' }
      });
      
      return NextResponse.json({
        status: 'EXPIRED',
        message: 'Transaksi sudah expired'
      });
    }
    
    // If no Tripay credentials, check from database status only
    if (!TRIPAY_CONFIG.apiKey || !transaction.paymentRef) {
      return NextResponse.json({
        status: 'PENDING',
        message: 'Menunggu pembayaran'
      });
    }
    
    // Check status from Tripay
    const response = await fetch(
      `${TRIPAY_CONFIG.baseUrl}/transaction/detail?reference=${transaction.paymentRef}`,
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + TRIPAY_CONFIG.apiKey,
        }
      }
    );
    
    const data = await response.json();
    
    console.log('[Tripay Status] Response:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      return NextResponse.json({
        status: 'PENDING',
        message: 'Menunggu pembayaran'
      });
    }
    
    const tripayStatus = data.data?.status;
    
    // Update database based on Tripay status
    if (tripayStatus === 'PAID' || tripayStatus === 'SETTLED') {
      // Payment successful - add coins
      const [updatedTransaction, updatedUser] = await db.$transaction([
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
      
      console.log(`[Tripay] Payment SUCCESS: ${transaction.id}, Coins added: ${transaction.coinAmount}, New balance: ${updatedUser.coins}`);
      
      return NextResponse.json({
        status: 'PAID',
        transactionId: transaction.id,
        coins: transaction.coinAmount,
        newBalance: updatedUser.coins
      });
      
    } else if (tripayStatus === 'EXPIRED') {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'EXPIRED' }
      });
      
      return NextResponse.json({
        status: 'EXPIRED',
        message: 'Transaksi sudah expired'
      });
      
    } else if (tripayStatus === 'FAILED' || tripayStatus === 'CANCELED') {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'FAILED' }
      });
      
      return NextResponse.json({
        status: 'FAILED',
        message: 'Pembayaran gagal'
      });
    }
    
    // Still pending
    return NextResponse.json({
      status: 'PENDING',
      message: 'Menunggu pembayaran',
      expiredAt: transaction.expiredAt
    });
    
  } catch (error) {
    console.error('[Tripay Status] Error:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan server' 
    }, { status: 500 });
  }
}

// Manual confirm for demo/testing
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
    
    // Check if expired
    if (transaction.expiredAt && new Date() > transaction.expiredAt) {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'EXPIRED' }
      });
      return NextResponse.json({ error: 'Transaction expired' }, { status: 400 });
    }
    
    // Manual confirm - add coins
    const [updatedTransaction, updatedUser] = await db.$transaction([
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
    
    console.log(`[Manual Confirm] SUCCESS: ${transaction.id}, Coins: ${transaction.coinAmount}, Balance: ${updatedUser.coins}`);
    
    return NextResponse.json({
      success: true,
      status: 'PAID',
      coins: transaction.coinAmount,
      newBalance: updatedUser.coins
    });
    
  } catch (error) {
    console.error('[Manual Confirm] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

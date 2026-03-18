import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// This endpoint receives webhook from Tripay when payment is completed
// In production, this will be called automatically by Tripay
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify signature (in production with real Tripay)
    // const signature = request.headers.get('X-Callback-Signature');
    // if (!verifyWebhookSignature(signature, JSON.stringify(body))) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }
    
    const { merchant_ref, status, amount } = body;
    
    // Find transaction by reference
    const transaction = await db.transaction.findFirst({
      where: { paymentRef: merchant_ref }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // If payment successful
    if (status === 'PAID' || status === 'paid') {
      await db.$transaction([
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
          where: { id: transaction.userId },
          data: {
            coins: { increment: transaction.coinAmount }
          }
        })
      ]);
      
      return NextResponse.json({ success: true, message: 'Payment confirmed' });
    }
    
    // If payment failed or expired
    if (status === 'FAILED' || status === 'EXPIRED') {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'FAILED' }
      });
      
      return NextResponse.json({ success: true, message: 'Payment failed' });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

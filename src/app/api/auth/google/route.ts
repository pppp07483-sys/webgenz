import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, setSession, generateNextUserId, verifyGoogleToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { idToken, name } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Google token diperlukan' },
        { status: 400 }
      );
    }
    
    // Verify Google token
    const googleUser = await verifyGoogleToken(idToken);
    
    if (!googleUser) {
      return NextResponse.json(
        { error: 'Token Google tidak valid' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    let user = await db.user.findUnique({
      where: { googleId: googleUser.sub }
    });
    
    if (!user) {
      // Also check by email
      user = await db.user.findUnique({
        where: { email: googleUser.email }
      });
      
      if (user) {
        // Update existing user with Google ID
        user = await db.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.sub,
            avatar: googleUser.picture
          }
        });
      } else {
        // Generate sequential userId (8 digits)
        const userId = await generateNextUserId();
        
        // Create new user
        user = await db.user.create({
          data: {
            userId,
            email: googleUser.email,
            name: name || googleUser.name,
            googleId: googleUser.sub,
            avatar: googleUser.picture,
            coins: 0
          }
        });
      }
    } else {
      // Update name if provided
      if (name && name !== user.name) {
        user = await db.user.update({
          where: { id: user.id },
          data: { name }
        });
      }
    }
    
    // Check if user needs to set name
    const needsName = !user.name || user.name.trim() === '';
    
    // Set session
    const token = generateToken();
    await setSession(user.id, token);
    
    return NextResponse.json({
      success: true,
      needsName,
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        coins: user.coins
      },
      sessionToken: `${user.id}_${token}` // Return for client-side storage
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

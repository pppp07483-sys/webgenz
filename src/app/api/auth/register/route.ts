import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, setSession, generateNextUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }
    
    // Generate sequential userId (8 digits)
    const userId = await generateNextUserId();
    
    // Create user
    const hashedPassword = hashPassword(password);
    const token = generateToken();
    
    const user = await db.user.create({
      data: {
        userId,
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        phone,
        coins: 0
      }
    });
    
    // Set session
    await setSession(user.id, token);
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        coins: user.coins
      },
      sessionToken: `${user.id}_${token}` // Return for client-side storage
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

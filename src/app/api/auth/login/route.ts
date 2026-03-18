import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await db.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Email tidak terdaftar' },
        { status: 400 }
      );
    }
    
    // Check if user has password (might be Google-only user)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Akun ini menggunakan Google login. Silakan login dengan Google.' },
        { status: 400 }
      );
    }
    
    // Check password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 400 }
      );
    }
    
    // Set session
    const token = generateToken();
    await setSession(user.id, token);
    
    return NextResponse.json({
      success: true,
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

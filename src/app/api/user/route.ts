import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Get current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        coins: user.coins
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Update user name
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const { name } = await request.json();
    
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nama minimal 2 karakter' },
        { status: 400 }
      );
    }
    
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { name: name.trim() }
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        userId: updatedUser.userId,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        coins: updatedUser.coins
      }
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

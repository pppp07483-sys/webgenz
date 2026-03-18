import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    const website = await db.website.findFirst({
      where: {
        id,
        userId: user.id
      }
    });
    
    if (!website) {
      return NextResponse.json(
        { error: 'Website tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      website: {
        id: website.id,
        title: website.title,
        description: website.description,
        prompt: website.prompt,
        status: website.status,
        htmlContent: website.htmlContent,
        cssContent: website.cssContent,
        jsContent: website.jsContent,
        coinCost: website.coinCost,
        createdAt: website.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get website error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Delete website
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    await db.website.deleteMany({
      where: {
        id,
        userId: user.id
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Delete website error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
